import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";

import { useAuth } from "@/hooks/useAuth";

function extractErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
      "Unable to create account."
    );
  }
  return "Unable to create account.";
}

export default function RegisterPage() {
  const { register, isAuthenticated, isBootstrapping } = useAuth();
  const [fullName, setFullName] = useState("Demo User");
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isBootstrapping && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        full_name: fullName,
        email,
        password,
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-900/80 p-8 shadow-soft backdrop-blur">
      <div className="mb-6">
        <div className="text-sm text-slate-400">Create account</div>
        <h2 className="mt-2 text-3xl font-semibold text-white">Start your collaborative workspace</h2>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Field label="Full name">
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            type="text"
            autoComplete="name"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-indigo-400/60"
            placeholder="Jane Doe"
          />
        </Field>

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
            autoComplete="new-password"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-indigo-400/60"
            placeholder="At least 8 characters"
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
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-indigo-300 hover:text-indigo-200">
          Sign in
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