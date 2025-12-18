import { Suspense } from 'react';
import { SignupForm } from '@/components/auth/signup-form';
import { UserPlus } from 'lucide-react';

function SignupContent() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-border bg-slate-950/50 p-8 shadow-2xl shadow-black/30">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-purple-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Create Your Account</h1>
            <p className="text-muted-foreground text-sm">
              Complete your profile to get started with The Donna
            </p>
          </div>
        </div>

        {/* Signup Form */}
        <SignupForm />

        {/* Footer */}
        <div className="text-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <a
              href="/auth/login"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
