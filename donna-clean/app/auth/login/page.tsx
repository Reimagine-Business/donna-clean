// app/auth/login/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createSupabaseBrowser(); // ← Works with @supabase/ssr cookies
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-slate-950/50 p-8 shadow-2xl shadow-black/30">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Login</h1>
          <p className="text-sm text-slate-400">
            Enter your email below to login to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#a78bfa] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#a78bfa] disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-white/10 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#a78bfa] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#9770ff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
