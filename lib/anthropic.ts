import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type {
  Interaction,
  InteractionMention,
  Person,
  Project,
  ProjectFile,
  Strategy,
  StrategyOption,
} from "./db";

const MODEL = "claude-opus-4-7";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI features."
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

const StepSchema = z.object({
  person_id: z.string().nullable(),
  person_name: z.string(),
  action: z.string(),
  communication_guidance: z.string(),
});

const OptionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  steps: z.array(StepSchema).min(1),
  estimated_timeframe: z.string(),
  risks: z.array(z.string()),
  why_this_works: z.string(),
});

const StrategyResponseSchema = z.object({
  options: z.array(OptionSchema).length(3),
});

const reliabilityLabel = (r: number) =>
  r >= 4 ? "high" : r >= 3 ? "medium" : "low";
const workloadLabel = (w: number) =>
  w >= 4 ? "heavy" : w >= 3 ? "moderate" : "light";

function renderNetwork(
  people: Person[],
  interactions: Interaction[],
  completedStrategies: Strategy[],
  projects: Project[],
  files: ProjectFile[],
  mentions: InteractionMention[]
): string {
  const interactionsByPerson = new Map<string, Interaction[]>();
  for (const i of interactions) {
    if (!i.person_id) continue;
    const arr = interactionsByPerson.get(i.person_id) ?? [];
    arr.push(i);
    interactionsByPerson.set(i.person_id, arr);
  }

  const lines: string[] = [];
  lines.push("# Professional Network\n");

  if (people.length === 0) {
    lines.push("(No people in the network yet.)\n");
  } else {
    for (const p of people) {
      lines.push(`## ${p.name} — ${p.role || "(role not specified)"}`);
      lines.push(`- id: ${p.id}`);
      lines.push(
        `- reliability: ${p.reliability}/5 (${reliabilityLabel(p.reliability)})`
      );
      lines.push(
        `- current workload: ${p.workload}/5 (${workloadLabel(p.workload)})`
      );
      if (p.communication_style) {
        lines.push(`- communication style: ${p.communication_style}`);
      }
      if (p.personality_notes) {
        lines.push(`- personality notes: ${p.personality_notes}`);
      }
      const recent = (interactionsByPerson.get(p.id) ?? []).slice(0, 5);
      if (recent.length > 0) {
        lines.push("- recent interactions:");
        for (const r of recent) {
          const date = new Date(r.created_at).toISOString().slice(0, 10);
          const ctx = r.project_context ? ` [${r.project_context}]` : "";
          lines.push(`  * ${date}${ctx}: ${r.content}`);
        }
      }
      lines.push("");
    }
  }

  if (projects.length > 0) {
    lines.push("# Projects\n");
    for (const pr of projects) {
      lines.push(`## ${pr.name}`);
      lines.push(`- id: ${pr.id}`);
      if (pr.description) lines.push(`- description: ${pr.description}`);
      const projectFiles = files.filter((f) => f.project_id === pr.id);
      if (projectFiles.length > 0) {
        lines.push("- files:");
        for (const f of projectFiles.slice(0, 20)) {
          const notes = f.notes ? ` — ${f.notes.slice(0, 200)}` : "";
          lines.push(`  * [${f.id}] ${f.name}${notes}`);
        }
      }
      lines.push("");
    }
  }

  if (mentions.length > 0) {
    const personName = (id: string) =>
      people.find((p) => p.id === id)?.name ?? "unknown";
    const projectName = (id: string) =>
      projects.find((p) => p.id === id)?.name ?? "unknown";
    const fileName = (id: string) =>
      files.find((f) => f.id === id)?.name ?? "unknown";
    const labelFor = (type: string, id: string) =>
      type === "person"
        ? personName(id)
        : type === "project"
        ? projectName(id)
        : fileName(id);

    const byInteraction = new Map<string, InteractionMention[]>();
    for (const m of mentions) {
      const arr = byInteraction.get(m.interaction_id) ?? [];
      arr.push(m);
      byInteraction.set(m.interaction_id, arr);
    }
    const linkPairs = new Map<string, number>();
    for (const group of byInteraction.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          const k1 = `${a.mention_type}:${a.target_id}`;
          const k2 = `${b.mention_type}:${b.target_id}`;
          const key = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
          linkPairs.set(key, (linkPairs.get(key) ?? 0) + 1);
        }
      }
    }
    if (linkPairs.size > 0) {
      lines.push("# Mind-map links (from @mentions in interactions)\n");
      const sorted = [...linkPairs.entries()].sort((a, b) => b[1] - a[1]);
      for (const [key, count] of sorted.slice(0, 40)) {
        const [left, right] = key.split("|");
        const [lt, lid] = left.split(":");
        const [rt, rid] = right.split(":");
        lines.push(
          `- ${lt}:${labelFor(lt, lid)}  ↔  ${rt}:${labelFor(rt, rid)}  (co-mentioned ${count}x)`
        );
      }
      lines.push("");
    }
  }

  const generalInteractions = interactions
    .filter((i) => !i.person_id)
    .slice(0, 10);
  if (generalInteractions.length > 0) {
    lines.push("# General Team Interactions\n");
    for (const r of generalInteractions) {
      const date = new Date(r.created_at).toISOString().slice(0, 10);
      const ctx = r.project_context ? ` [${r.project_context}]` : "";
      lines.push(`- ${date}${ctx}: ${r.content}`);
    }
    lines.push("");
  }

  if (completedStrategies.length > 0) {
    lines.push("# Past Strategy Outcomes (feedback for improvement)\n");
    for (const s of completedStrategies) {
      if (s.chosen_index === null || s.rating === null) continue;
      const chosen = s.options[s.chosen_index];
      lines.push(`## Project: ${s.project_description}`);
      lines.push(`- chosen strategy: "${chosen?.title ?? "unknown"}"`);
      lines.push(`- outcome rating: ${s.rating}/5`);
      if (s.feedback) {
        lines.push(`- feedback: ${s.feedback}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are ProjectMind, an AI project-management copilot for a project manager.

Your job: when the user describes a task or project workflow, propose exactly 3 distinctly different ranked strategies for getting it done, using the specific people in their professional network.

Each strategy must include:
- A short title and a one-paragraph summary of the overall approach.
- An ordered list of steps. Each step names ONE person and describes what they do and, separately, how the PM should communicate with them — tailored to that person's communication style and personality.
- A realistic estimated timeframe (e.g., "2-3 days", "about a week").
- Specific risks and warnings (overload, unreliability, inter-personal friction, skill gaps, timezone issues, etc.).
- A "why this works" explanation grounded in the network context.

Ranking principles (apply in this order):
1. Prefer people with higher reliability for load-bearing / critical-path steps.
2. Avoid overloading people who are already at heavy workload; spread work when possible.
3. Match the task type to the person's role and past interactions.
4. Learn from past strategy outcomes: if a past approach worked, lean toward similar patterns; if it failed, avoid the failure mode.
5. Tune communication guidance to each person's stated style (e.g., terse vs. warm, async vs. sync, data-driven vs. narrative).

Make the 3 options meaningfully different — e.g., a fast-and-lean option, a thorough/safe option, and a creative/alternative option. Rank option[0] as the recommended default.

If critical information is missing, make reasonable assumptions and call them out in the "risks" field rather than refusing.

Always reference people who actually exist in the provided network. Use their exact id (from the network context) as \`person_id\`. Only set \`person_id\` to null if you are intentionally referencing someone outside the network (and explain why in the step's action field).`;

export async function generateStrategies(args: {
  projectDescription: string;
  people: Person[];
  interactions: Interaction[];
  completedStrategies: Strategy[];
  projects: Project[];
  files: ProjectFile[];
  mentions: InteractionMention[];
}): Promise<StrategyOption[]> {
  const networkContext = renderNetwork(
    args.people,
    args.interactions,
    args.completedStrategies,
    args.projects,
    args.files,
    args.mentions
  );

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(StrategyResponseSchema),
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: networkContext,
      },
    ],
    messages: [
      {
        role: "user",
        content: `Here is the task / project I need to tackle:\n\n${args.projectDescription}\n\nPlease produce 3 ranked strategies in the required JSON format.`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Model did not return parseable output");
  }
  return response.parsed_output.options;
}

const EmailTagSchema = z.object({
  results: z.array(
    z.object({
      message_id: z.string(),
      project_id: z.string().nullable(),
      summary: z.string(),
    })
  ),
});

export async function summarizeEmails(args: {
  messages: Array<{
    id: string;
    subject: string;
    from_name: string;
    from_address: string;
    received_at: number;
    body: string;
  }>;
  projects: Project[];
}): Promise<Array<{ message_id: string; project_id: string | null; summary: string }>> {
  if (args.messages.length === 0) return [];

  const projectList = args.projects
    .map((p) => `- id=${p.id}  name="${p.name}"  description="${p.description}"`)
    .join("\n");

  const emailDigest = args.messages
    .map((m) => {
      const date = new Date(m.received_at).toISOString().slice(0, 10);
      const body = m.body.slice(0, 1500);
      return `=== email id=${m.id} ===\nfrom: ${m.from_name} <${m.from_address}>\ndate: ${date}\nsubject: ${m.subject}\n\n${body}`;
    })
    .join("\n\n");

  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system: [
      {
        type: "text",
        text: `You triage incoming email for a project manager. For each email, decide which (if any) of the user's projects it relates to and write a one-sentence summary focused on actions, decisions, deadlines, or status updates relevant to that project. If an email is unrelated to any project, set project_id to null and still write a one-sentence summary.

Use exact project ids from the list — never invent new ones. Echo back every email_id you receive.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Projects:\n${projectList || "(none)"}\n\nEmails to triage:\n\n${emailDigest}`,
      },
    ],
    output_config: {
      effort: "low",
      format: zodOutputFormat(EmailTagSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Email triage model returned no parseable output");
  }
  // Defensively map by message_id so caller doesn't depend on order.
  const projectIds = new Set(args.projects.map((p) => p.id));
  return response.parsed_output.results.map((r) => ({
    message_id: r.message_id,
    project_id: r.project_id && projectIds.has(r.project_id) ? r.project_id : null,
    summary: r.summary,
  }));
}
