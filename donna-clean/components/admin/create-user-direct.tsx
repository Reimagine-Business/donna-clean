'use client';

import { useState } from 'react';
import { UserPlus, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { createUserDirect, generatePassword } from '@/app/admin/users/create-actions';

export function CreateUserDirect() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    businessName: '',
    username: '',
    phone: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    password: string;
    username: string;
  } | null>(null);

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
    setMessage({
      type: 'info',
      text: 'Password generated! Make sure to copy it before creating the user.',
    });
  };

  const handleCopyPassword = async () => {
    if (formData.password) {
      await navigator.clipboard.writeText(formData.password);
      setMessage({
        type: 'success',
        text: '✓ Password copied to clipboard!',
      });
    }
  };

  const handleCopyCredentials = async () => {
    if (createdUser) {
      const credentials = `Email: ${createdUser.email}\nUsername: ${createdUser.username}\nPassword: ${createdUser.password}`;
      await navigator.clipboard.writeText(credentials);
      setMessage({
        type: 'success',
        text: '✓ Credentials copied to clipboard!',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setCreatedUser(null);

    if (!formData.email || !formData.password || !formData.businessName || !formData.username) {
      setMessage({ type: 'error', text: 'All required fields must be filled' });
      return;
    }

    setIsLoading(true);

    try {
      const result = await createUserDirect(formData);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `✓ User created successfully! Email: ${formData.email}`,
        });

        // Store credentials for copying
        setCreatedUser({
          email: formData.email,
          password: formData.password,
          username: formData.username,
        });

        // Clear form except keep credentials visible
        setFormData({
          email: '',
          password: '',
          businessName: '',
          username: '',
          phone: '',
        });
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to create user',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  return (
    <div className="space-y-4">
      {/* Success with credentials */}
      {createdUser && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-500 mb-2">User created successfully!</p>
              <div className="text-xs space-y-1 font-mono bg-black/20 p-3 rounded">
                <p><span className="text-muted-foreground">Email:</span> {createdUser.email}</p>
                <p><span className="text-muted-foreground">Username:</span> {createdUser.username}</p>
                <p><span className="text-muted-foreground">Password:</span> {createdUser.password}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleCopyCredentials}
            className="w-full px-3 py-2 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors flex items-center justify-center gap-2"
          >
            <Copy className="h-3 w-3" />
            Copy All Credentials
          </button>
          <p className="text-xs text-muted-foreground">
            ⚠️ Send these credentials to the user securely. They can login and change their password.
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="user@example.com"
            required
            disabled={isLoading}
          />
        </div>

        {/* Business Name */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium mb-2">
            Business Name *
          </label>
          <input
            type="text"
            id="businessName"
            value={formData.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Company LLC"
            required
            disabled={isLoading}
          />
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-2">
            Username *
          </label>
          <input
            type="text"
            id="username"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value.toLowerCase())}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="johndoe"
            required
            disabled={isLoading}
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_-]+"
          />
          <p className="text-xs text-muted-foreground mt-1">
            3-20 characters, letters, numbers, underscores, or hyphens
          </p>
        </div>

        {/* Phone (Optional) */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            Phone Number <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="+1 (555) 123-4567"
            disabled={isLoading}
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Temporary Password *
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="w-full px-4 py-2 pr-20 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:bg-muted rounded"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {formData.password && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1 hover:bg-muted rounded"
                    disabled={isLoading}
                  >
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
              Generate
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            User will be able to change this on first login
          </p>
        </div>

        {/* Error/Success Message */}
        {message && !createdUser && (
          <div
            className={`p-3 rounded-lg border flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/30'
                : message.type === 'error'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-blue-500/10 border-blue-500/30'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            ) : message.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              Creating User...
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5" />
              Create User
            </>
          )}
        </button>
      </form>
    </div>
  );
}
