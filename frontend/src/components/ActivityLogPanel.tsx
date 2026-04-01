import { Activity } from "lucide-react";

import { formatRelativeDate } from "@/lib/utils";
import type { ActivityEvent } from "@/types/api";

type ActivityLogPanelProps = {
  events: ActivityEvent[];
};

export default function ActivityLogPanel({
  events,
}: ActivityLogPanelProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Activity size={18} className="text-indigo-300" />
        <h3 className="text-base font-semibold text-white">Activity log</h3>
      </div>

      <div className="mt-4 space-y-3">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
            Activity events will appear here.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm leading-6 text-slate-200">
                  {event.message}
                </div>
                <div className="rounded-full border border-white/10 bg-slate-950/80 px-2 py-0.5 text-[11px] text-slate-400">
                  {event.points >= 0 ? `+${event.points}` : event.points} pts
                </div>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                {event.event_type} • {formatRelativeDate(event.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}