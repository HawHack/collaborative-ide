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
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [memberActionState, setMemberActionState] = useState<string | null>(null);
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

    setMemberActionError(null);
    setMemberActionState("Adding collaborator...");
    try {
      await onAddMember({ email, role: inviteRole });
      setInviteEmail("");
      setMemberActionState("Collaborator added.");
      setTimeout(() => setMemberActionState(null), 2000);
    } catch (error) {
      setMemberActionState(null);
      setMemberActionError(extractMessage(error, "Unable to add collaborator."));
    }
  };

  const handleRoleChange = async (userId: string, role: "editor" | "viewer") => {
    if (!onUpdateMemberRole) {
      return;
    }
    setMemberActionError(null);
    setMemberActionState("Updating role...");
    try {
      await onUpdateMemberRole(userId, role);
      setMemberActionState("Role updated.");
      setTimeout(() => setMemberActionState(null), 2000);
    } catch (error) {
      setMemberActionState(null);
      setMemberActionError(extractMessage(error, "Unable to update role."));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!onRemoveMember) {
      return;
    }
    setMemberActionError(null);
    setMemberActionState("Removing collaborator...");
    try {
      await onRemoveMember(userId);
      setMemberActionState("Collaborator removed.");
      setTimeout(() => setMemberActionState(null), 2000);
    } catch (error) {
      setMemberActionState(null);
      setMemberActionError(extractMessage(error, "Unable to remove collaborator."));
    }
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

        {isSaving ? (
          <div className="mt-3 text-xs text-slate-500">Saving editor changes…</div>
        ) : null}
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
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="teammate@example.com"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400/60"
            />

            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as "editor" | "viewer")}
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400/60"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="button"
                onClick={() => void handleInvite()}
                disabled={!inviteEmail.trim()}
                className="rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add
              </button>
            </div>

            {memberActionState ? (
              <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
                {memberActionState}
              </div>
            ) : null}

            {memberActionError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {memberActionError}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
            Only the owner can invite or remove collaborators.
          </div>
        )}

        <div className="mt-4 space-y-3">
          {sortedMembers.map((member) => {
            const isOwner = member.role === "owner";
            return (
              <div
                key={member.user.id}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white"
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
                          <Crown size={12} />
                          owner
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                          {member.role}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 truncate text-xs text-slate-500">{member.user.email}</div>

                    {canManageMembers && !isOwner ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(event) =>
                            void handleRoleChange(
                              member.user.id,
                              event.target.value as "editor" | "viewer"
                            )
                          }
                          className="rounded-xl border border-white/10 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => void handleRemoveMember(member.user.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-400/20 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-200 transition hover:bg-rose-500/20"
                        >
                          <Trash2 size={13} />
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </div>
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
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium capitalize text-slate-200">{value}</span>
    </div>
  );
}

function extractMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
