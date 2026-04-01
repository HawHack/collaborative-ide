import { Play, TerminalSquare } from "lucide-react";

import type { ExecutionRun } from "@/types/api";

type RunPanelProps = {
  runs: ExecutionRun[];
  isRunning: boolean;
  language: "python" | "javascript";
  error?: string | null;
  onRun: () => Promise<void> | void;
};

function statusBadgeClass(status: ExecutionRun["status"]) {
  switch (status) {
    case "completed":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "running":
    case "queued":
      return "border-sky-400/20 bg-sky-500/10 text-sky-200";
    case "timeout":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    default:
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
  }
}

export default function RunPanel({
  runs,
  isRunning,
  language,
  error,
  onRun,
}: RunPanelProps) {
  const latestRun = runs[0] ?? null;

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TerminalSquare size={18} className="text-indigo-300" />
            <h3 className="text-base font-semibold text-white">Run code</h3>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Execute the current editor snapshot in an isolated {language} sandbox.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onRun()}
          disabled={isRunning}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Play size={16} />
          {isRunning ? "Running..." : "Run code"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="text-sm font-medium text-slate-200">
            {latestRun ? `Latest run • ${latestRun.language}` : "No run output yet"}
          </div>

          {latestRun ? (
            <div
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(latestRun.status)}`}
            >
              {latestRun.status}
            </div>
          ) : null}
        </div>

        <pre className="max-h-80 min-h-[240px] overflow-auto whitespace-pre-wrap break-words px-4 py-4 text-sm leading-6 text-slate-300">
          {latestRun?.combined_output ||
            "Press “Run code” to execute the current editor content and inspect stdout / stderr here."}
        </pre>
      </div>

      {runs.length > 1 ? (
        <div className="mt-4 space-y-2">
          {runs.slice(1, 5).map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <div className="truncate text-slate-300">
                {run.language} • exit {run.exit_code ?? "—"} • {run.duration_ms ?? "—"} ms
              </div>
              <div
                className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(run.status)}`}
              >
                {run.status}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}