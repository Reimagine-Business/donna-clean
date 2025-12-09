"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { loginAction } from "@/app/auth/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { showInfo } from "@/lib/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, formAction] = useActionState(loginAction, { error: null });

  useEffect(() => {
    if (
      state?.error === "Verify email" &&
      typeof window !== "undefined"
    ) {
      showInfo("Verify email");
    }
  }, [state?.error]);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
          <CardContent>
            <form action={formAction}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                    name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                    name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
                {state?.error && (
                  <p className="text-sm text-red-500" role="alert">
                    {state.error}
                  </p>
                )}
                <SubmitButton pendingText="Logging in..." idleText="Login" />
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SubmitButton({ pendingText, idleText }: { pendingText: string; idleText: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingText}
        </span>
      ) : (
        idleText
      )}
    </Button>
  );
}
