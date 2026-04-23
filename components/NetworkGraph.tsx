"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Person, Relationship } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

type Props = {
  people: Person[];
  relationships: Relationship[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const reliabilityColor = (r: number): string => {
  if (r >= 4) return "#22c55e";
  if (r >= 3) return "#eab308";
  return "#ef4444";
};

export default function NetworkGraph({
  people,
  relationships,
  selectedId,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resize = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes = people.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      reliability: p.reliability,
      workload: p.workload,
      val: Math.max(2, p.workload * 3),
      color: reliabilityColor(p.reliability),
    }));
    const links = relationships
      .filter(
        (r) =>
          people.some((p) => p.id === r.person_a_id) &&
          people.some((p) => p.id === r.person_b_id)
      )
      .map((r) => ({
        source: r.person_a_id,
        target: r.person_b_id,
        strength: r.strength,
      }));
    return { nodes, links };
  }, [people, relationships]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {people.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
          Add a teammate to start building your network.
        </div>
      ) : size.width > 0 && size.height > 0 ? (
        <ForceGraph2D
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor="#0a0a0f"
          nodeLabel={(n: any) =>
            `${n.name}${n.role ? ` — ${n.role}` : ""} · reliability ${n.reliability}/5 · workload ${n.workload}/5`
          }
          nodeRelSize={5}
          linkColor={() => "rgba(124, 92, 255, 0.35)"}
          linkWidth={(l: any) => 0.5 + (l.strength ?? 1) * 0.6}
          cooldownTicks={80}
          onNodeClick={(n: any) => onSelect(n.id as string)}
          onBackgroundClick={() => onSelect(null)}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const radius = Math.max(4, Math.sqrt(node.val) * 3);
            const isSelected = node.id === selectedId;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();
            ctx.lineWidth = isSelected ? 2.5 : 1;
            ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255,255,255,0.25)";
            ctx.stroke();

            const label = node.name as string;
            const fontSize = Math.max(10, 12 / globalScale);
            ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
            ctx.fillStyle = "#e2e8f0";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(label, node.x, node.y + radius + 2);
          }}
        />
      ) : null}
    </div>
  );
}
