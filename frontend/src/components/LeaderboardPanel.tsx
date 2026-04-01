import { Medal } from "lucide-react";

import { initials } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/api";

type LeaderboardPanelProps = {
  entries: LeaderboardEntry[];
};

export default function LeaderboardPanel({
  entries,
}: LeaderboardPanelProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Medal size={18} className="text-indigo-300" />
        <h3 className="text-base font-semibold text-white">Leaderboard</h3>
      </div>

      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
            No activity points yet.
          </div>
        ) : (
          entries.map((entry, index) => (
            <div
              key={entry.user_id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-xs text-slate-300">
                  {index + 1}
                </div>

                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: entry.avatar_color }}
                >
                  {initials(entry.full_name)}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">
                    {entry.full_name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {entry.event_count} events
                  </div>
                </div>
              </div>

              <div className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-200">
                {entry.total_points} pts
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}