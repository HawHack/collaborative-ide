import { ArrowUpRight, Clock3, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { formatRelativeDate } from "@/lib/utils";
import type { ProjectListItem } from "@/types/api";

type ProjectCardProps = {
  project: ProjectListItem;
};

function languageBadge(language: ProjectListItem["language"]) {
  return language === "python"
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/20"
    : "bg-amber-500/15 text-amber-300 border-amber-400/20";
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-white/[0.07]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${languageBadge(project.language)}`}
            >
              {project.language}
            </span>
            <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-xs text-slate-400">
              {project.visibility}
            </span>
          </div>

          <h3 className="truncate text-xl font-semibold text-white">{project.name}</h3>
          <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-6 text-slate-400">
            {project.description || "No project description yet."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 transition group-hover:border-indigo-400/30 group-hover:text-indigo-200">
          <ArrowUpRight size={18} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 text-sm text-slate-400 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Users size={15} />
          <span>{project.member_count} collaborators</span>
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          <Clock3 size={15} />
          <span>{formatRelativeDate(project.last_activity_at ?? project.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}