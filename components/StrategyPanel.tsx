"use client";

import { useState } from "react";
import type { Strategy, StrategyOption } from "@/lib/types";

type Props = {
  strategy: Strategy | null;
  loading: boolean;
  onGenerate: (description: string) => Promise<void>;
  onRated: (s: Strategy) => void;
};

export default function StrategyPanel({
  strategy,
  loading,
  onGenerate,
  onRated,
}: Props) {
  const [description, setDescription] = useState("");
  const [expandedIdx, setExpandedIdx] = useState(0);
  const [ratingIdx, setRatingIdx] = useState<number | null>(null);
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function generate() {
    if (!description.trim()) return;
    setExpandedIdx(0);
    setRatingIdx(null);
    await onGenerate(description);
  }

  async function submitRating() {
    if (!strategy || ratingIdx === null) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/strategies/${strategy.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chosen_index: ratingIdx,
          rating,
          feedback,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onRated(data.strategy);
        setRatingIdx(null);
        setFeedback("");
        setRating(4);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-muted space-y-2">
        <label className="label">Describe a task or project</label>
        <textarea
          className="textarea"
          rows={4}
          placeholder="e.g., 'We need to ship a redesigned onboarding flow in 3 weeks. Includes copy, design, backend plumbing for A/B testing, and coordination with marketing for launch.'"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
        <div className="flex justify-end">
          <button
            className="btn-primary"
            onClick={generate}
            disabled={loading || !description.trim()}
          >
            {loading ? "Generating strategies…" : "Generate 3 strategies"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="inline-block w-3 h-3 rounded-full bg-accent animate-pulse mr-2" />
            Thinking through your network…
          </div>
        ) : !strategy ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Describe a project above to get 3 ranked strategies based on your
            network.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="text-xs text-slate-500 uppercase tracking-wider">
              For: {strategy.project_description.slice(0, 120)}
              {strategy.project_description.length > 120 ? "…" : ""}
            </div>
            {strategy.options.map((opt, idx) => (
              <OptionCard
                key={idx}
                idx={idx}
                option={opt}
                expanded={expandedIdx === idx}
                onToggle={() => setExpandedIdx(expandedIdx === idx ? -1 : idx)}
                chosen={strategy.chosen_index === idx}
                completed={strategy.rating !== null}
                onChoose={() => {
                  if (strategy.rating === null) setRatingIdx(idx);
                }}
              />
            ))}

            {ratingIdx !== null && strategy.rating === null ? (
              <div className="card-elevated p-4 space-y-3 border-accent-muted">
                <div className="text-sm font-medium">
                  Rate "{strategy.options[ratingIdx].title}" after completion
                </div>
                <div>
                  <label className="label">How did it go? {rating}/5</label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                </div>
                <div>
                  <label className="label">What worked / what didn't</label>
                  <textarea
                    className="textarea mt-1"
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Priya delivered ahead of time; Marcus was slower than expected because of the platform migration."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="btn-ghost"
                    onClick={() => setRatingIdx(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={submitRating}
                    disabled={submitting}
                  >
                    {submitting ? "Saving…" : "Submit feedback"}
                  </button>
                </div>
              </div>
            ) : null}

            {strategy.rating !== null ? (
              <div className="card p-3 text-sm text-slate-300">
                <span className="chip mr-2">Completed</span>
                Rated {strategy.rating}/5. The AI will use this to improve
                future recommendations.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function OptionCard({
  idx,
  option,
  expanded,
  onToggle,
  chosen,
  completed,
  onChoose,
}: {
  idx: number;
  option: StrategyOption;
  expanded: boolean;
  onToggle: () => void;
  chosen: boolean;
  completed: boolean;
  onChoose: () => void;
}) {
  const rankLabel = ["Recommended", "Alternative", "Backup"][idx] ?? `#${idx + 1}`;
  return (
    <div
      className={`card p-4 transition-colors ${
        chosen ? "border-accent" : ""
      }`}
    >
      <div
        className="flex items-start justify-between gap-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="chip bg-accent-muted text-white border-accent">
              {rankLabel}
            </span>
            <span className="text-xs text-slate-400">
              {option.estimated_timeframe}
            </span>
          </div>
          <div className="font-medium text-slate-100">{option.title}</div>
          <div className="text-sm text-slate-400 mt-1">{option.summary}</div>
        </div>
        <div className="text-slate-500 text-xs">{expanded ? "▾" : "▸"}</div>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4">
          <div>
            <div className="label mb-1">Steps</div>
            <ol className="space-y-2">
              {option.steps.map((s, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-500 font-mono">{i + 1}.</span>
                    <span className="font-medium text-slate-200">
                      {s.person_name}
                    </span>
                  </div>
                  <div className="ml-6 text-slate-300">{s.action}</div>
                  <div className="ml-6 mt-1 text-xs text-accent">
                    → {s.communication_guidance}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {option.risks.length > 0 ? (
            <div>
              <div className="label mb-1">Risks</div>
              <ul className="text-sm text-slate-300 space-y-1">
                {option.risks.map((r, i) => (
                  <li key={i}>⚠ {r}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <div className="label mb-1">Why this works</div>
            <div className="text-sm text-slate-400">
              {option.why_this_works}
            </div>
          </div>

          {!completed ? (
            <div className="pt-2">
              <button className="btn-secondary" onClick={onChoose}>
                I went with this one
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
