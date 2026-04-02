import { Play, TerminalSquare } from "lucide-react";

import { formatRelativeDate } from "@/lib/utils";
import type { ExecutionRun } from "@/types/api";

type RunPanelProps = {
  runs: ExecutionRun[];
  isRunning: boolean;
  language: "python" | "javascript";
  error?: string | null;
  onRun: () => Promise<void> | void;
};

function statusBadge(status: ExecutionRun["status"]) {
  switch (status) {
    case "completed":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "failed":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "timeout":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "running":
      return "border-sky-400/20 bg-sky-500/10 text-sky-200";
    default:
      return "border-white/10 bg-white/5 text-slate-300";
  }
}

function previewOutput(run: ExecutionRun) {
  const text =
    run.combined_output?.trim() ||
    run.stdout?.trim() ||
    run.stderr?.trim() ||
    "Process finished with no output.";

  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

export default function RunPanel({
  runs,
  isRunning,
  language,
  error,
  onRun,
}: RunPanelProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TerminalSquare size={18} className="text-indigo-300" />
            <h3 className="text-base font-semibold text-white">Compiler</h3>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Run the current {language} buffer and inspect recent execution history.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onRun()}
          disabled={isRunning}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Play size={16} />
          {isRunning ? "Running…" : `Run ${language}`}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {runs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
            No runs yet. Launch the compiler to create the first execution entry.
          </div>
        ) : (
          runs.map((run) => (
            <div
              key={run.id}
              className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusBadge(run.status)}`}>
                    {run.status}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                    {run.language}
                  </span>
                  {run.exit_code !== null ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                      exit {run.exit_code}
                    </span>
                  ) : null}
                  {run.duration_ms !== null ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                      {run.duration_ms} ms
                    </span>
                  ) : null}
                </div>

                <div className="text-xs text-slate-500">
                  {formatRelativeDate(run.finished_at ?? run.started_at ?? run.created_at)}
                </div>
              </div>

              <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-xs text-slate-200">
                {previewOutput(run)}
              </pre>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
