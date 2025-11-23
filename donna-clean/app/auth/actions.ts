"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthState = {
  error?: string | null;
  success?: boolean;
};

const getOrigin = async () => {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) {
    return origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:3000";
};

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required" };
  }

    const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid credentials" };
  }

  const user = data.user;
  const confirmedTimestamp =
    user?.email_confirmed_at ??
    (user as { confirmed_at?: string | null })?.confirmed_at ??
    (user?.user_metadata?.confirmed_at as string | null) ??
    null;
  const isVerified = Boolean(confirmedTimestamp);

  if (!isVerified) {
    await supabase.auth.signOut();
    return { error: "Verify email" };
  }

  redirect("/home");
}

export async function signUpAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const repeatPassword = formData.get("repeat-password");

  if (typeof email !== "string" || typeof password !== "string" || typeof repeatPassword !== "string") {
    return { error: "Please complete the form." };
  }

  if (password !== repeatPassword) {
    return { error: "Passwords do not match" };
  }

    const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/protected`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/auth/sign-up-success");
}

export async function forgotPasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get("email");

  if (typeof email !== "string") {
    return { error: "Email is required" };
  }

    const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updatePasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = formData.get("password");

  if (typeof password !== "string" || !password.length) {
    return { error: "Password is required" };
  }

    const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/protected");
}

export async function logoutAction() {
    const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
