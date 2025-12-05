export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-slate-950/50 p-8 shadow-2xl shadow-black/30">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-white">Invitation Required</h1>

          <p className="text-muted-foreground">
            Public sign-ups are currently disabled. This application is invite-only.
          </p>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 space-y-2">
            <p className="text-sm text-purple-200 font-medium">
              Need access?
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact your system administrator to request an invitation.
            </p>
          </div>

          <div className="pt-4">
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center w-full rounded-lg bg-primary py-2.5 px-4 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
