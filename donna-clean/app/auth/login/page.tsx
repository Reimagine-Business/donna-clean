// app/auth/login/page.tsx
"use client";

export const dynamic = 'force-dynamic';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let loginEmail = emailOrUsername;

      // Check if input is a username (no @ symbol)
      if (!emailOrUsername.includes('@')) {
        // Look up username to get email
        const { data, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', emailOrUsername)
          .single();

        if (lookupError || !data) {
          setError('Username not found');
          setLoading(false);
          return;
        }

        loginEmail = data.email;
      }

      // Sign in with email (from username lookup or direct email input)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Navigate to dashboard - navigation loads fresh data automatically
      router.push("/dashboard");
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-slate-950/50 p-8 shadow-2xl shadow-black/30">
        <h1 className="text-2xl font-semibold text-white">Login</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email or username to login to your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/70">Email or Username</label>
            <input
              type="text"
              placeholder="m@example.com or johndoe"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              disabled={loading}
              className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-muted-foreground">Forgot your password?</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-black transition hover:bg-[#9f78f5] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
