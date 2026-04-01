import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-soft">
        <div className="text-sm text-slate-400">404</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Page not found</h1>
        <p className="mt-3 text-slate-400">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-2xl bg-indigo-500 px-4 py-3 font-medium text-white transition hover:bg-indigo-400"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}