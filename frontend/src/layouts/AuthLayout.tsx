import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-10 shadow-soft backdrop-blur lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-200">
                Collaborative IDE Platform
              </div>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white">
                Real-time coding workspace with CRDT collaboration, AI review and secure execution.
              </h1>
              <p className="mt-4 max-w-lg text-base text-slate-300">
                Build, review and run code together with a workspace designed for teams, not throwaway demos.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FeatureCard title="Yjs Collaboration" text="Conflict-free live editing and awareness sync." />
              <FeatureCard title="AI Review" text="Structured review output with fallback mode." />
              <FeatureCard title="Sandbox Runs" text="Execution isolated in ephemeral containers." />
            </div>
          </div>

          <div className="flex items-center justify-center">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{text}</p>
    </div>
  );
}