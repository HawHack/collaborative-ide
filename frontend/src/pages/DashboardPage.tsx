import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FolderOpenDot, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import CreateProjectModal from "@/components/CreateProjectModal";
import ProjectCard from "@/components/ProjectCard";
import { useDebounce } from "@/hooks/useDebounce";
import { projectService } from "@/services/projectService";
import type { ProjectListItem } from "@/types/api";

function extractErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
      "Unable to load projects."
    );
  }
  return "Unable to load projects.";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    let active = true;

    const loadProjects = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await projectService.list(debouncedSearch || undefined);
        if (!active) {
          return;
        }
        setProjects(data);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(extractErrorMessage(err));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  const projectCountLabel = useMemo(() => {
    if (projects.length === 1) {
      return "1 project";
    }
    return `${projects.length} projects`;
  }, [projects.length]);

  const handleCreateProject = async (payload: {
    name: string;
    description: string;
    language: "python" | "javascript";
  }) => {
    setIsCreateSubmitting(true);

    try {
      const created = await projectService.create(payload);
      setIsCreateOpen(false);
      navigate(`/projects/${created.id}`);
    } finally {
      setIsCreateSubmitting(false);
    }
  };

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-soft">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm text-slate-400">Workspace</div>
              <h1 className="mt-2 text-3xl font-semibold text-white">Projects dashboard</h1>
              <p className="mt-3 max-w-2xl text-slate-400">
                Manage collaborative rooms, open active workstreams and jump back into live editing sessions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 font-medium text-white transition hover:bg-indigo-400"
            >
              <Plus size={18} />
              New project
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-soft">
          <div className="text-sm text-slate-400">Overview</div>
          <div className="mt-2 text-3xl font-semibold text-white">{projectCountLabel}</div>
          <p className="mt-3 text-sm text-slate-400">
            Search, filter and open any collaborative IDE room from one place.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-slate-900/70 p-4 shadow-soft md:p-5">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
          <Search size={18} className="text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects by name"
            className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
          />
        </div>
      </section>

      <section className="mt-6">
        {isLoading ? (
          <div className="grid gap-5 xl:grid-cols-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-56 animate-pulse rounded-[28px] border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-5 text-rose-200">
            {error}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-10 text-center shadow-soft">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/15 text-indigo-200">
              <FolderOpenDot size={28} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">No projects yet</h2>
            <p className="mx-auto mt-3 max-w-md text-slate-400">
              Create your first collaborative workspace to start coding together in real time.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 font-medium text-white transition hover:bg-indigo-400"
            >
              <Plus size={18} />
              Create first project
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      <CreateProjectModal
        isOpen={isCreateOpen}
        isSubmitting={isCreateSubmitting}
        onClose={() => {
          if (!isCreateSubmitting) {
            setIsCreateOpen(false);
          }
        }}
        onSubmit={handleCreateProject}
      />
    </>
  );
}