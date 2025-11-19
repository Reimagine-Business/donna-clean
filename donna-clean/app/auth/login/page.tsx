import { createSupabaseServerClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";  // Import User type from Supabase

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase.auth.getUser();

  const user = data.user ?? null;

  const shouldAlertVerifyEmail = Boolean(user && !getConfirmedTimestamp(user));

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-slate-950/50 p-8 shadow-2xl shadow-black/30">
        <h1 className="text-2xl font-semibold text-white">Login</h1>
        <p className="text-sm text-slate-400">Enter your email below to login to your account</p>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              placeholder="m@example.com"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#a78bfa]"
              required
            />
            <p className="mt-1 text-xs text-slate-400">Forgot your password?</p>
          </div>
          <button type="submit" className="w-full rounded-lg bg-black py-2 text-white font-semibold">
            Login
          </button>
          <p className="text-sm text-slate-400">Don't have an account? <a href="#" className="text-[#a78bfa]">Sign up</a></p>
        </form>
      </div>
    </div>
  );
}

function getConfirmedTimestamp(user: User | null) {
  return user?.confirmed_at;  // Type user as User | null, access safely
}
