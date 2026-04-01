import { FormEvent, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import axios from "axios";

import { useAuth } from "@/hooks/useAuth";

function extractErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
      "Unable to sign in."
    );
  }
  return "Unable to sign in.";
}

export default function LoginPage() {
  const { login, isAuthenticated, isBootstrapping } = useAuth();
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();

  const redirectTo = useMemo(() => {
    return (location.state as { from?: string } | undefined)?.from ?? "/dashboard";
  }, [location.state]);

  if (!isBootstrapping && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
      <div className="mb-6">
        <div className="text-sm text-slate-400">Welcome back</div>
        <h2 className="mt-2 text-3xl font-semibold text-white">Sign in to your workspace</h2>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Field label="Email">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-indigo-400/60"
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-indigo-400/60"
            placeholder="••••••••"
          />
        </Field>

        {error && (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-indigo-500 px-4 py-3 font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-400">
        Need an account?{" "}
        <Link to="/register" className="font-medium text-indigo-300 hover:text-indigo-200">
          Create one
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{label}</div>
      {children}
    </label>
  );
}