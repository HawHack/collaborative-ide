import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { X } from "lucide-react";

type CreateProjectModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    language: "python" | "javascript";
  }) => Promise<void>;
};

function extractErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
      "Unable to create project."
    );
  }
  return "Unable to create project.";
}

export default function CreateProjectModal({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: CreateProjectModalProps) {
  const [name, setName] = useState("Realtime Playground");
  const [description, setDescription] = useState("Collaborative coding workspace");
  const [language, setLanguage] = useState<"python" | "javascript">("python");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        language,
      });
      setName("Realtime Playground");
      setDescription("Collaborative coding workspace");
      setLanguage("python");
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-slate-900/95 p-6 shadow-soft">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-400">New project</div>
            <h2 className="mt-1 text-2xl font-semibold text-white">Create collaborative workspace</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-300">Project name</div>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-indigo-400/60"
              placeholder="Realtime Playground"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-300">Description</div>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={5000}
              className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-indigo-400/60"
              placeholder="Describe the project goals or current workstream"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-300">Language</div>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as "python" | "javascript")}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-indigo-400/60"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
          </label>

          {error && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}