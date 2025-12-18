'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Building2, User, Phone, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { completeSignup, checkUsernameAvailability } from '@/app/auth/sign-up/actions';

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    username: '',
    phone: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: '' });
  const [error, setError] = useState<string | null>(null);

  // Check for invitation token in URL
  const isInvited = searchParams.get('invited') === 'true';

  // Debounced username availability check
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length < 3) {
        setUsernameCheck({ checking: false, available: null, message: '' });
        return;
      }

      setUsernameCheck({ checking: true, available: null, message: '' });

      const result = await checkUsernameAvailability(formData.username);

      if (result.available) {
        setUsernameCheck({
          checking: false,
          available: true,
          message: 'Username is available',
        });
      } else {
        setUsernameCheck({
          checking: false,
          available: false,
          message: result.error || 'Username is taken',
        });
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [formData.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    // Check username availability
    if (usernameCheck.available === false) {
      setError('Please choose an available username');
      return;
    }

    setIsLoading(true);

    try {
      const result = await completeSignup({
        email: formData.email,
        password: formData.password,
        businessName: formData.businessName,
        username: formData.username,
        phone: formData.phone || undefined,
      });

      if (result.success) {
        // Redirect to login or success page
        router.push('/auth/sign-up-success');
      } else {
        setError(result.error || 'Signup failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email Address *
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="you@company.com"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Business Name */}
      <div>
        <label htmlFor="businessName" className="block text-sm font-medium mb-2">
          Business Name *
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            id="businessName"
            value={formData.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Your Company LLC"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium mb-2">
          Username *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            id="username"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value.toLowerCase())}
            className="w-full pl-10 pr-10 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="johndoe"
            required
            disabled={isLoading}
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_-]+"
          />
          {usernameCheck.checking && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
          )}
          {!usernameCheck.checking && usernameCheck.available === true && (
            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
          )}
          {!usernameCheck.checking && usernameCheck.available === false && (
            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
          )}
        </div>
        {usernameCheck.message && (
          <p className={`text-xs mt-1 ${usernameCheck.available ? 'text-green-500' : 'text-red-500'}`}>
            {usernameCheck.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          3-20 characters, letters, numbers, underscores, or hyphens
        </p>
      </div>

      {/* Phone (Optional) */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-2">
          Phone Number <span className="text-muted-foreground">(optional)</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="+1 (555) 123-4567"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2">
          Password *
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="••••••••"
            required
            minLength={8}
            disabled={isLoading}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          At least 8 characters
        </p>
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
          Confirm Password *
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="password"
            id="confirmPassword"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="••••••••"
            required
            minLength={8}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || usernameCheck.available === false}
        className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Creating Account...
          </>
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  );
}
