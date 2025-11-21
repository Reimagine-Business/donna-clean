"use client";

import { useEffect, useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/app/auth/actions";

const initialState = { error: null as string | null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-[#a78bfa] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9770ff] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState);

  useEffect(() => {
    console.log("🔥 FORM STATE:", state);
  }, [state]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-slate-950/50 p-8 shadow-2xl shadow-black/30">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Login</h1>
          <p className="text-sm text-slate-400">
            Enter your email below to login to your account
          </p>
        </div>

          <form
            action={formAction}
            onSubmit={() => {
              console.log("🔥 FORM SUBMITTING - form is trying to submit");
            }}
            className="space-y-4"
          >
          <div>
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              name="email"
              placeholder="m@example.com"
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#a78bfa] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              name="password"
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#a78bfa] disabled:opacity-50"
            />
          </div>

          {state?.error && (
            <p className="rounded-lg border border-white/10 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {state.error}
            </p>
          )}

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
