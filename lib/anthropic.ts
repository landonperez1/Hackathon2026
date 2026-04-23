import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type {
  Interaction,
  Person,
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
  completedStrategies: Strategy[]
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
}): Promise<StrategyOption[]> {
  const networkContext = renderNetwork(
    args.people,
    args.interactions,
    args.completedStrategies
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
