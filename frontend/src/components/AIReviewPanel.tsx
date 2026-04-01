import { AlertTriangle, CheckCircle2, Clock3, GitMerge, Info, Sparkles } from "lucide-react";

import type { AIReview } from "@/types/api";

type AIReviewPanelProps = {
  review: AIReview | null;
  isLoading: boolean;
  error?: string | null;
  onReview: () => Promise<void> | void;
  statusText?: string | null;
  cooldownSeconds?: number;
};

function severityBadge(severity: "low" | "medium" | "high") {
  if (severity === "high") {
    return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  }
  if (severity === "medium") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }
  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
}

export default function AIReviewPanel({
  review,
  isLoading,
  error,
  onReview,
  statusText,
  cooldownSeconds = 0,
}: AIReviewPanelProps) {
  const isCooldown = cooldownSeconds > 0;
  const isDisabled = isLoading || isCooldown;

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-300" />
            <h3 className="text-base font-semibold text-white">AI review</h3>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Structured review with summary, issues, suggestions and merge guidance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onReview()}
          disabled={isDisabled}
          className="rounded-2xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Reviewing..." : isCooldown ? `Wait ${cooldownSeconds}s` : "Run AI review"}
        </button>
      </div>

      {(statusText || isCooldown) && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          <Clock3 size={15} className="text-sky-300" />
          <span>{statusText ?? `Cooldown: ${cooldownSeconds}s`}</span>
        </div>
      )}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {!review ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
          No review yet. Press “Run AI review” to analyze the current editor snapshot.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-300">
                {review.provider}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-300">
                {review.model}
              </span>
              {review.fallback_used ? (
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                  fallback mode
                </span>
              ) : (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                  live AI
                </span>
              )}
            </div>

            <div className="mt-3 text-sm leading-6 text-slate-200">{review.summary}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2">
              <GitMerge size={16} className="text-indigo-300" />
              <h4 className="text-sm font-semibold text-white">Merge guidance</h4>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {review.merge_suggestion.should_merge ? (
                <CheckCircle2 size={16} className="text-emerald-300" />
              ) : (
                <AlertTriangle size={16} className="text-amber-300" />
              )}
              <span className="text-sm text-slate-200">{review.merge_suggestion.rationale}</span>
            </div>

            {review.merge_suggestion.blockers.length > 0 && (
              <ul className="mt-3 space-y-2">
                {review.merge_suggestion.blockers.map((blocker, index) => (
                  <li
                    key={`${blocker}-${index}`}
                    className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
                  >
                    {blocker}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-white">Issues</h4>

            {review.issues.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-white/10 px-3 py-3 text-sm text-slate-400">
                No issues were reported.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {review.issues.map((issue, index) => (
                  <div key={`${issue.title}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${severityBadge(
                          issue.severity
                        )}`}
                      >
                        {issue.severity}
                      </span>
                      <div className="text-sm font-medium text-slate-100">{issue.title}</div>
                      {(issue.line_start ?? issue.line_end) ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                          lines {issue.line_start ?? "?"}-{issue.line_end ?? issue.line_start ?? "?"}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{issue.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h4 className="text-sm font-semibold text-white">Suggestions</h4>

            {review.suggestions.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-white/10 px-3 py-3 text-sm text-slate-400">
                No suggestions were returned.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {review.suggestions.map((suggestion, index) => (
                  <div key={`${suggestion.title}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-sm font-medium text-slate-100">{suggestion.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{suggestion.description}</div>
                    {suggestion.patch_hint ? (
                      <div className="mt-2 flex items-start gap-2 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
                        <Info size={14} className="mt-0.5 shrink-0" />
                        <span>{suggestion.patch_hint}</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}