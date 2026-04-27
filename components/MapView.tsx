"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Location, Shipment } from "@/lib/types";

type Props = {
  locations: Location[];
  shipments: Shipment[];
  selectedLocationId: string | null;
  selectedShipmentId: string | null;
  onSelectLocation: (id: string) => void;
  onSelectShipment: (id: string) => void;
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#94a3b8",
  loading: "#fbbf24",
  in_transit: "#38bdf8",
  delivered: "#34d399",
  delayed: "#f87171",
  cancelled: "#64748b",
};

const KIND_ICONS: Record<string, string> = {
  site: "🏗️",
  warehouse: "🏭",
  delivery: "📦",
  office: "🏢",
};

function makeIcon(emoji: string, highlighted: boolean): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:34px;height:34px;border-radius:50%;
      background:${highlighted ? "#a855f7" : "#1e293b"};
      border:2px solid ${highlighted ? "#facc15" : "#475569"};
      color:white;font-size:16px;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    ">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export default function MapView({
  locations,
  shipments,
  selectedLocationId,
  selectedShipmentId,
  onSelectLocation,
  onSelectShipment,
}: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize the map exactly once.
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, {
      center: [39.8283, -98.5795], // Geographic center of the contiguous US.
      zoom: 4,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Re-render markers + routes whenever data or selection changes.
  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !markerLayer || !routeLayer) return;

    markerLayer.clearLayers();
    routeLayer.clearLayers();

    const locById = new Map(locations.map((l) => [l.id, l]));

    for (const loc of locations) {
      const isSelected = loc.id === selectedLocationId;
      const icon = makeIcon(KIND_ICONS[loc.kind] ?? "📍", isSelected);
      const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(markerLayer);
      marker.bindTooltip(loc.label, { direction: "top", offset: [0, -16] });
      marker.on("click", () => onSelectLocation(loc.id));
    }

    for (const ship of shipments) {
      const origin = locById.get(ship.origin_id);
      const dest = locById.get(ship.destination_id);
      if (!origin || !dest) continue;
      const color = STATUS_COLORS[ship.status] ?? "#94a3b8";
      const isSelected = ship.id === selectedShipmentId;

      const polyline = L.polyline(
        [
          [origin.lat, origin.lng],
          [dest.lat, dest.lng],
        ],
        {
          color,
          weight: isSelected ? 5 : 3,
          opacity: ship.status === "cancelled" ? 0.3 : 0.8,
          dashArray: ship.status === "scheduled" ? "8,8" : undefined,
        }
      ).addTo(routeLayer);
      polyline.bindTooltip(`${ship.label} (${ship.status.replace("_", " ")})`, {
        sticky: true,
      });
      polyline.on("click", () => onSelectShipment(ship.id));

      // Animated truck marker partway along the line for in-transit shipments.
      if (ship.status === "in_transit" || ship.status === "delayed") {
        const t = Math.max(0, Math.min(1, ship.progress));
        const lat = origin.lat + (dest.lat - origin.lat) * t;
        const lng = origin.lng + (dest.lng - origin.lng) * t;
        const truckIcon = makeIcon("🚚", isSelected);
        const truck = L.marker([lat, lng], { icon: truckIcon }).addTo(
          routeLayer
        );
        truck.bindTooltip(ship.label, { direction: "top", offset: [0, -16] });
        truck.on("click", () => onSelectShipment(ship.id));
      }
    }

    // Auto-fit when there's data and nothing's selected.
    if (
      locations.length > 0 &&
      !selectedLocationId &&
      !selectedShipmentId
    ) {
      const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    } else if (selectedLocationId) {
      const loc = locById.get(selectedLocationId);
      if (loc) map.setView([loc.lat, loc.lng], Math.max(map.getZoom(), 10));
    }
  }, [
    locations,
    shipments,
    selectedLocationId,
    selectedShipmentId,
    onSelectLocation,
    onSelectShipment,
  ]);

  return <div ref={mapEl} className="w-full h-full" />;
}
