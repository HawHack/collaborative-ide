import { useMemo, useState } from "react";
import { Crown, FileCode2, MailPlus, Settings2, Trash2, Users } from "lucide-react";

import { initials } from "@/lib/utils";
import type { Project, ProjectRole } from "@/types/api";

type ProjectSidebarProps = {
  project: Project;
  currentUserRole: ProjectRole;
  selectedLanguage: "python" | "javascript";
  onLanguageChange: (language: "python" | "javascript") => void;
  onAddMember?: (payload: { email: string; role: "editor" | "viewer" }) => Promise<void> | void;
  onUpdateMemberRole?: (userId: string, role: "editor" | "viewer") => Promise<void> | void;
  onRemoveMember?: (userId: string) => Promise<void> | void;
  isSaving?: boolean;
};

export default function ProjectSidebar({
  project,
  currentUserRole,
  selectedLanguage,
  onLanguageChange,
  onAddMember,
  onUpdateMemberRole,
  onRemoveMember,
  isSaving = false,
}: ProjectSidebarProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const canManageMembers = currentUserRole === "owner";

  const sortedMembers = useMemo(
    () => [...(project.members ?? [])].sort((a, b) => a.user.full_name.localeCompare(b.user.full_name)),
    [project.members]
  );

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || !onAddMember) {
      return;
    }
    await onAddMember({ email, role: inviteRole });
    setInviteEmail("");
  };

  return (
    <section className="space-y-4 rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Settings2 size={18} className="text-indigo-300" />
        <h3 className="text-base font-semibold text-white">Project dock</h3>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">Project</div>
        <div className="mt-2 text-lg font-semibold text-white">{project.name}</div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {project.description || "No description provided."}
        </p>

        <div className="mt-4 grid gap-3 text-sm">
          <InfoRow label="Role" value={currentUserRole} />
          <InfoRow label="Visibility" value={project.visibility} />
          <InfoRow label="Collaborators" value={String(project.member_count)} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <FileCode2 size={16} className="text-indigo-300" />
          Runtime language
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["python", "javascript"] as const).map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => onLanguageChange(language)}
              className={`rounded-2xl border px-3 py-2 text-sm transition ${
                selectedLanguage === language
                  ? language === "python"
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                    : "border-amber-400/20 bg-amber-500/10 text-amber-200"
                  : "border-white/10 bg-slate-950/70 text-slate-300 hover:bg-white/5"
              }`}
            >
              {language === "python" ? "Python" : "JavaScript"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Users size={16} className="text-indigo-300" />
          Members
        </div>

        {canManageMembers ? (
          <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
              <MailPlus size={14} />
              Add by email
            </div>

            <input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400/40"
            />

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as "editor" | "viewer")}
                className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-200 outline-none"
              >
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </select>

              <button
                type="button"
                onClick={() => void handleInvite()}
                disabled={isSaving || !inviteEmail.trim()}
                className="rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 space-y-3">
          {sortedMembers.map((member) => {
            const isOwner = member.role === "owner";
            return (
              <div
                key={member.user.id}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white"
                    style={{ backgroundColor: member.user.avatar_color }}
                  >
                    {initials(member.user.full_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-medium text-white">
                        {member.user.full_name}
                      </div>
                      {isOwner ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                          <Crown size={11} /> owner
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-slate-400">{member.user.email}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  {isOwner ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                      owner
                    </span>
                  ) : canManageMembers ? (
                    <select
                      value={member.role}
                      onChange={(event) =>
                        void onUpdateMemberRole?.(
                          member.user.id,
                          event.target.value as "editor" | "viewer"
                        )
                      }
                      disabled={isSaving}
                      className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none"
                    >
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                      {member.role}
                    </span>
                  )}

                  {canManageMembers && !isOwner ? (
                    <button
                      type="button"
                      onClick={() => void onRemoveMember?.(member.user.id)}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-xs text-slate-200">
        {value}
      </span>
    </div>
  );
}
