"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import type {
  Location,
  Project,
  Shipment,
  ShipmentStatus,
} from "@/lib/types";

// Leaflet touches `window` on import — keep it client-only.
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  scheduled: "Scheduled",
  loading: "Loading",
  in_transit: "In transit",
  delivered: "Delivered",
  delayed: "Delayed",
  cancelled: "Cancelled",
};

const STATUS_BADGE: Record<ShipmentStatus, string> = {
  scheduled: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  loading: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  in_transit: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  delivered: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  delayed: "bg-red-500/20 text-red-300 border-red-500/40",
  cancelled: "bg-slate-500/10 text-slate-500 border-slate-500/30",
};

export default function MapPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(
    null
  );
  const [tab, setTab] = useState<"locations" | "shipments">("locations");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const safe = (url: string): Promise<Record<string, unknown>> =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));

    async function load() {
      try {
        const [locRes, shipRes, prjRes] = await Promise.all([
          safe("/api/locations"),
          safe("/api/shipments"),
          safe("/api/projects"),
        ]);
        if (cancelled) return;
        setLocations((locRes.locations as Location[]) ?? []);
        setShipments((shipRes.shipments as Shipment[]) ?? []);
        setProjects((prjRes.projects as Project[]) ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const locMap = useMemo(
    () => new Map(locations.map((l) => [l.id, l])),
    [locations]
  );

  function selectLocation(id: string) {
    setSelectedLocationId(id);
    setSelectedShipmentId(null);
    setTab("locations");
  }
  function selectShipment(id: string) {
    setSelectedShipmentId(id);
    setSelectedLocationId(null);
    setTab("shipments");
  }

  return (
    <div className="h-screen flex flex-col">
      <AppHeader
        stats={
          <>
            <span className="chip">{locations.length} locations</span>
            <span className="chip">{shipments.length} shipments</span>
          </>
        }
      />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 relative bg-bg">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              Loading map…
            </div>
          ) : (
            <MapView
              locations={locations}
              shipments={shipments}
              selectedLocationId={selectedLocationId}
              selectedShipmentId={selectedShipmentId}
              onSelectLocation={selectLocation}
              onSelectShipment={selectShipment}
            />
          )}
          {locations.length === 0 && !loading ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="card p-4 text-sm text-slate-300 max-w-md text-center pointer-events-auto">
                No locations yet. Add a project site or warehouse from the
                sidebar to see it on the map.
              </div>
            </div>
          ) : null}
        </main>

        <aside className="w-[420px] border-l border-border bg-bg-raised flex flex-col flex-shrink-0">
          <div className="flex border-b border-border-muted">
            {(["locations", "shipments"] as const).map((t) => (
              <button
                key={t}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? "text-slate-100 border-b-2 border-accent"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                onClick={() => setTab(t)}
              >
                {t === "locations"
                  ? `📍 Locations (${locations.length})`
                  : `🚚 Shipments (${shipments.length})`}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === "locations" ? (
              <LocationsPanel
                locations={locations}
                projects={projects}
                projectMap={projectMap}
                selectedId={selectedLocationId}
                onSelect={selectLocation}
                onCreated={(loc) => {
                  setLocations((prev) => [loc, ...prev]);
                  setSelectedLocationId(loc.id);
                }}
                onDeleted={(id) => {
                  setLocations((prev) => prev.filter((l) => l.id !== id));
                  setShipments((prev) =>
                    prev.filter(
                      (s) => s.origin_id !== id && s.destination_id !== id
                    )
                  );
                  if (selectedLocationId === id) setSelectedLocationId(null);
                }}
              />
            ) : (
              <ShipmentsPanel
                shipments={shipments}
                locations={locations}
                projects={projects}
                projectMap={projectMap}
                locMap={locMap}
                selectedId={selectedShipmentId}
                onSelect={selectShipment}
                onCreated={(s) => {
                  setShipments((prev) => [s, ...prev]);
                  setSelectedShipmentId(s.id);
                }}
                onUpdated={(s) =>
                  setShipments((prev) =>
                    prev.map((x) => (x.id === s.id ? s : x))
                  )
                }
                onDeleted={(id) => {
                  setShipments((prev) => prev.filter((s) => s.id !== id));
                  if (selectedShipmentId === id) setSelectedShipmentId(null);
                }}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function LocationsPanel({
  locations,
  projects,
  projectMap,
  selectedId,
  onSelect,
  onCreated,
  onDeleted,
}: {
  locations: Location[];
  projects: Project[];
  projectMap: Map<string, Project>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreated: (loc: Location) => void;
  onDeleted: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="p-3 space-y-2">
      {!adding ? (
        <button
          className="btn-primary w-full justify-center text-sm"
          onClick={() => setAdding(true)}
        >
          + Add location
        </button>
      ) : (
        <AddLocationForm
          projects={projects}
          onCancel={() => setAdding(false)}
          onCreated={(loc) => {
            onCreated(loc);
            setAdding(false);
          }}
        />
      )}

      {locations.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-6">
          Search an address above to drop your first pin.
        </div>
      ) : (
        locations.map((loc) => {
          const proj = loc.project_id ? projectMap.get(loc.project_id) : null;
          const isSelected = loc.id === selectedId;
          return (
            <div
              key={loc.id}
              className={`card p-3 cursor-pointer transition-colors ${
                isSelected ? "border-accent" : "hover:bg-bg-hover"
              }`}
              onClick={() => onSelect(loc.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-100 truncate">
                    {loc.label}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {loc.address || `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <span className="chip text-[10px]">{loc.kind}</span>
                    {proj ? (
                      <span className="chip text-[10px] text-accent border-accent">
                        📁 {proj.name}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  className="btn-ghost text-xs text-red-400"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Delete "${loc.label}"?`)) return;
                    await fetch(`/api/locations/${loc.id}`, {
                      method: "DELETE",
                    });
                    onDeleted(loc.id);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

type GeocodeHit = {
  label: string;
  lat: number;
  lng: number;
  type: string;
};

function AddLocationForm({
  projects,
  onCancel,
  onCreated,
}: {
  projects: Project[];
  onCancel: () => void;
  onCreated: (loc: Location) => void;
}) {
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<GeocodeHit | null>(null);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("site");
  const [projectId, setProjectId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Debounce geocode lookups so we don't hammer Nominatim.
  useEffect(() => {
    if (!search.trim() || picked) {
      setHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(search)}&limit=6`
        );
        const data = await res.json();
        setHits(data.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [search, picked]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label || picked.label.split(",")[0],
          address: picked.label,
          lat: picked.lat,
          lng: picked.lng,
          kind,
          project_id: projectId || null,
        }),
      });
      const data = await res.json();
      if (res.ok) onCreated(data.location);
      else alert(`Save failed: ${data.error}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="label">Add location</div>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={onCancel}
        >
          ×
        </button>
      </div>

      {!picked ? (
        <div>
          <input
            className="input"
            placeholder="Search address or place…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {searching ? (
            <div className="text-xs text-slate-500 mt-2">Searching…</div>
          ) : null}
          {hits.length > 0 ? (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {hits.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left p-2 rounded hover:bg-bg-hover text-xs text-slate-300"
                  onClick={() => {
                    setPicked(h);
                    setLabel(h.label.split(",")[0]);
                  }}
                >
                  📍 {h.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="text-xs text-slate-400 break-words">
            📍 {picked.label}
          </div>
          <button
            type="button"
            className="text-xs text-accent underline"
            onClick={() => {
              setPicked(null);
              setHits([]);
            }}
          >
            ← search again
          </button>

          <div>
            <label className="label block mb-1">Label</label>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label block mb-1">Kind</label>
            <select
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="site">🏗️ Project site</option>
              <option value="warehouse">🏭 Warehouse</option>
              <option value="delivery">📦 Delivery point</option>
              <option value="office">🏢 Office</option>
            </select>
          </div>
          <div>
            <label className="label block mb-1">Project (optional)</label>
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">— none —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="btn-primary w-full justify-center text-sm"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save location"}
          </button>
        </>
      )}
    </form>
  );
}

function ShipmentsPanel({
  shipments,
  locations,
  projects,
  projectMap,
  locMap,
  selectedId,
  onSelect,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  shipments: Shipment[];
  locations: Location[];
  projects: Project[];
  projectMap: Map<string, Project>;
  locMap: Map<string, Location>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreated: (s: Shipment) => void;
  onUpdated: (s: Shipment) => void;
  onDeleted: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="p-3 space-y-2">
      {!adding ? (
        <button
          className="btn-primary w-full justify-center text-sm"
          disabled={locations.length < 2}
          onClick={() => setAdding(true)}
        >
          + Schedule shipment
        </button>
      ) : (
        <AddShipmentForm
          locations={locations}
          projects={projects}
          onCancel={() => setAdding(false)}
          onCreated={(s) => {
            onCreated(s);
            setAdding(false);
          }}
        />
      )}
      {locations.length < 2 ? (
        <div className="text-[11px] text-slate-500 text-center px-2">
          Add at least two locations before scheduling a shipment.
        </div>
      ) : null}

      {shipments.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-6">
          No shipments scheduled.
        </div>
      ) : (
        shipments.map((s) => {
          const origin = locMap.get(s.origin_id);
          const dest = locMap.get(s.destination_id);
          const proj = s.project_id ? projectMap.get(s.project_id) : null;
          const isSelected = s.id === selectedId;
          return (
            <div
              key={s.id}
              className={`card p-3 cursor-pointer transition-colors ${
                isSelected ? "border-accent" : "hover:bg-bg-hover"
              }`}
              onClick={() => onSelect(s.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-100 truncate">
                    🚚 {s.label}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {origin?.label ?? "?"} → {dest?.label ?? "?"}
                  </div>
                  {s.cargo ? (
                    <div className="text-[11px] text-slate-400 truncate">
                      Cargo: {s.cargo}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span
                      className={`chip text-[10px] border ${STATUS_BADGE[s.status]}`}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                    {proj ? (
                      <span className="chip text-[10px] text-accent border-accent">
                        📁 {proj.name}
                      </span>
                    ) : null}
                    {s.eta ? (
                      <span className="chip text-[10px]">
                        ETA {new Date(s.eta).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  className="btn-ghost text-xs text-red-400"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Delete shipment "${s.label}"?`)) return;
                    await fetch(`/api/shipments/${s.id}`, { method: "DELETE" });
                    onDeleted(s.id);
                  }}
                >
                  ×
                </button>
              </div>
              {isSelected ? (
                <ShipmentControls shipment={s} onUpdated={onUpdated} />
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

function ShipmentControls({
  shipment,
  onUpdated,
}: {
  shipment: Shipment;
  onUpdated: (s: Shipment) => void;
}) {
  async function setStatus(status: ShipmentStatus) {
    const res = await fetch(`/api/shipments/${shipment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        progress:
          status === "delivered"
            ? 1
            : status === "in_transit"
            ? Math.max(shipment.progress, 0.05)
            : shipment.progress,
      }),
    });
    const data = await res.json();
    if (res.ok) onUpdated(data.shipment);
  }

  async function setProgress(p: number) {
    const res = await fetch(`/api/shipments/${shipment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: p }),
    });
    const data = await res.json();
    if (res.ok) onUpdated(data.shipment);
  }

  return (
    <div
      className="mt-3 pt-3 border-t border-border-muted space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <div className="label mb-1">Status</div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              "scheduled",
              "loading",
              "in_transit",
              "delivered",
              "delayed",
              "cancelled",
            ] as ShipmentStatus[]
          ).map((s) => (
            <button
              key={s}
              className={`chip text-[10px] cursor-pointer ${
                shipment.status === s ? "border-accent text-accent" : ""
              }`}
              onClick={() => setStatus(s)}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      {(shipment.status === "in_transit" || shipment.status === "delayed") && (
        <div>
          <div className="label mb-1">
            Progress: {Math.round(shipment.progress * 100)}%
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(shipment.progress * 100)}
            onChange={(e) => setProgress(Number(e.target.value) / 100)}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}

function AddShipmentForm({
  locations,
  projects,
  onCancel,
  onCreated,
}: {
  locations: Location[];
  projects: Project[];
  onCancel: () => void;
  onCreated: (s: Shipment) => void;
}) {
  const [label, setLabel] = useState("");
  const [cargo, setCargo] = useState("");
  const [originId, setOriginId] = useState(locations[0]?.id ?? "");
  const [destId, setDestId] = useState(locations[1]?.id ?? "");
  const [projectId, setProjectId] = useState("");
  const [eta, setEta] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (originId === destId) {
      alert("Origin and destination must differ.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          cargo,
          origin_id: originId,
          destination_id: destId,
          project_id: projectId || null,
          eta: eta ? new Date(eta).getTime() : null,
        }),
      });
      const data = await res.json();
      if (res.ok) onCreated(data.shipment);
      else alert(`Save failed: ${data.error}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="label">Schedule shipment</div>
        <button type="button" className="btn-ghost text-xs" onClick={onCancel}>
          ×
        </button>
      </div>
      <div>
        <label className="label block mb-1">Label</label>
        <input
          className="input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Concrete delivery #4"
          required
        />
      </div>
      <div>
        <label className="label block mb-1">Cargo</label>
        <input
          className="input"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          placeholder="What's being shipped"
        />
      </div>
      <div>
        <label className="label block mb-1">Origin</label>
        <select
          className="input"
          value={originId}
          onChange={(e) => setOriginId(e.target.value)}
          required
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label block mb-1">Destination</label>
        <select
          className="input"
          value={destId}
          onChange={(e) => setDestId(e.target.value)}
          required
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label block mb-1">Project (optional)</label>
        <select
          className="input"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">— none —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label block mb-1">ETA</label>
        <input
          type="date"
          className="input"
          value={eta}
          onChange={(e) => setEta(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="btn-primary w-full justify-center text-sm"
        disabled={submitting}
      >
        {submitting ? "Saving…" : "Schedule"}
      </button>
    </form>
  );
}
