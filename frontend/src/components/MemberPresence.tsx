import { Pencil, Users } from "lucide-react";

import { initials } from "@/lib/utils";
import type { ProjectMember } from "@/types/api";

type PresenceMember = {
  clientId: number;
  userId: string;
  fullName: string;
  email?: string;
  avatarColor: string;
  isEditing: boolean;
};

type MemberPresenceProps = {
  members?: ProjectMember[];
  presenceUsers?: PresenceMember[];
};

export default function MemberPresence({
  members = [],
  presenceUsers = [],
}: MemberPresenceProps) {
  const safeMembers = Array.isArray(members) ? members : [];
  const safePresenceUsers = Array.isArray(presenceUsers) ? presenceUsers : [];
  const onlineIds = new Set(safePresenceUsers.map((item) => item.userId));

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-indigo-300" />
        <h3 className="text-base font-semibold text-white">Participants</h3>
      </div>

      <div className="mt-4 space-y-3">
        {safeMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
            No participants available yet.
          </div>
        ) : (
          safeMembers.map((member) => {
            const isOnline = onlineIds.has(member.user.id);
            const livePresence = safePresenceUsers.find((item) => item.userId === member.user.id);

            return (
              <div
                key={member.user.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white"
                    style={{ backgroundColor: member.user.avatar_color }}
                  >
                    {initials(member.user.full_name)}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">
                      {member.user.full_name}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {member.role}
                      {isOnline ? " • online" : " • offline"}
                    </div>
                  </div>
                </div>

                {livePresence?.isEditing ? (
                  <div className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                    <Pencil size={12} />
                    editing
                  </div>
                ) : (
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-600"}`}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}