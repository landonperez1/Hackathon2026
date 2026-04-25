"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  InteractionMention,
  Person,
  Project,
  ProjectFile,
  Relationship,
} from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

type NodeKind = "person" | "project" | "file";
type SelectedRef = { kind: NodeKind; id: string };

type Props = {
  people: Person[];
  relationships: Relationship[];
  projects: Project[];
  files: ProjectFile[];
  mentions: InteractionMention[];
  selectedId: string | null;
  onSelect: (ref: SelectedRef | null) => void;
};

const reliabilityColor = (r: number): string => {
  if (r >= 4) return "#22c55e";
  if (r >= 3) return "#eab308";
  return "#ef4444";
};

const PROJECT_COLOR = "#7c5cff";
const FILE_COLOR = "#9177ff";

function nodeKey(kind: NodeKind, id: string): string {
  return `${kind}:${id}`;
}

export default function NetworkGraph({
  people,
  relationships,
  projects,
  files,
  mentions,
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
    const personIds = new Set(people.map((p) => p.id));
    const projectIds = new Set(projects.map((p) => p.id));
    const fileIds = new Set(files.map((f) => f.id));

    const nodes: any[] = [];

    for (const p of people) {
      nodes.push({
        id: nodeKey("person", p.id),
        refId: p.id,
        kind: "person",
        name: p.name,
        label: p.name,
        sublabel: p.role,
        val: Math.max(2, p.workload * 3),
        color: reliabilityColor(p.reliability),
      });
    }
    for (const pr of projects) {
      nodes.push({
        id: nodeKey("project", pr.id),
        refId: pr.id,
        kind: "project",
        name: pr.name,
        label: pr.name,
        sublabel: "project",
        val: 6,
        color: PROJECT_COLOR,
      });
    }
    for (const f of files) {
      nodes.push({
        id: nodeKey("file", f.id),
        refId: f.id,
        kind: "file",
        name: f.name,
        label: f.name,
        sublabel: "file",
        val: 3,
        color: FILE_COLOR,
      });
    }

    const links: any[] = [];
    const seen = new Set<string>();
    const addLink = (a: string, b: string, kind: string) => {
      const [x, y] = a < b ? [a, b] : [b, a];
      const key = `${kind}:${x}|${y}`;
      if (seen.has(key)) return;
      seen.add(key);
      links.push({ source: x, target: y, kind });
    };

    for (const r of relationships) {
      if (!personIds.has(r.person_a_id) || !personIds.has(r.person_b_id))
        continue;
      addLink(
        nodeKey("person", r.person_a_id),
        nodeKey("person", r.person_b_id),
        "peer"
      );
    }

    for (const f of files) {
      if (!projectIds.has(f.project_id)) continue;
      addLink(
        nodeKey("project", f.project_id),
        nodeKey("file", f.id),
        "contains"
      );
    }

    const mentionsByInteraction = new Map<string, InteractionMention[]>();
    for (const m of mentions) {
      const exists =
        (m.mention_type === "person" && personIds.has(m.target_id)) ||
        (m.mention_type === "project" && projectIds.has(m.target_id)) ||
        (m.mention_type === "file" && fileIds.has(m.target_id));
      if (!exists) continue;
      const arr = mentionsByInteraction.get(m.interaction_id) ?? [];
      arr.push(m);
      mentionsByInteraction.set(m.interaction_id, arr);
    }
    for (const group of mentionsByInteraction.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          addLink(
            nodeKey(group[i].mention_type as NodeKind, group[i].target_id),
            nodeKey(group[j].mention_type as NodeKind, group[j].target_id),
            "mention"
          );
        }
      }
    }

    return { nodes, links };
  }, [people, relationships, projects, files, mentions]);

  const isEmpty =
    people.length === 0 && projects.length === 0 && files.length === 0;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {isEmpty ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
          Add a teammate or a project to start building your network.
        </div>
      ) : size.width > 0 && size.height > 0 ? (
        <ForceGraph2D
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor="#0a0a0f"
          nodeLabel={(n: any) =>
            `${n.label}${n.sublabel ? ` — ${n.sublabel}` : ""}`
          }
          nodeRelSize={5}
          linkColor={(l: any) =>
            l.kind === "peer"
              ? "rgba(124, 92, 255, 0.35)"
              : l.kind === "contains"
              ? "rgba(145, 119, 255, 0.5)"
              : "rgba(200, 200, 255, 0.25)"
          }
          linkWidth={(l: any) => (l.kind === "mention" ? 0.6 : 1)}
          cooldownTicks={100}
          onNodeClick={(n: any) =>
            onSelect({ kind: n.kind as NodeKind, id: n.refId })
          }
          onBackgroundClick={() => onSelect(null)}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const radius = Math.max(4, Math.sqrt(node.val) * 3);
            const isSelected = node.refId === selectedId;

            if (node.kind === "project") {
              ctx.beginPath();
              ctx.rect(
                node.x - radius,
                node.y - radius,
                radius * 2,
                radius * 2
              );
              ctx.fillStyle = node.color;
              ctx.fill();
              ctx.lineWidth = isSelected ? 2.5 : 1;
              ctx.strokeStyle = isSelected
                ? "#ffffff"
                : "rgba(255,255,255,0.3)";
              ctx.stroke();
            } else if (node.kind === "file") {
              ctx.beginPath();
              ctx.moveTo(node.x, node.y - radius);
              ctx.lineTo(node.x + radius, node.y);
              ctx.lineTo(node.x, node.y + radius);
              ctx.lineTo(node.x - radius, node.y);
              ctx.closePath();
              ctx.fillStyle = node.color;
              ctx.fill();
              ctx.lineWidth = isSelected ? 2.5 : 1;
              ctx.strokeStyle = isSelected
                ? "#ffffff"
                : "rgba(255,255,255,0.3)";
              ctx.stroke();
            } else {
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
              ctx.fillStyle = node.color;
              ctx.fill();
              ctx.lineWidth = isSelected ? 2.5 : 1;
              ctx.strokeStyle = isSelected
                ? "#ffffff"
                : "rgba(255,255,255,0.25)";
              ctx.stroke();
            }

            const label = node.label as string;
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
