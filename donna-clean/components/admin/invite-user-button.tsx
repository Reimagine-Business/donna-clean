'use client';

import { useState } from 'react';
import { Mail, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { inviteUser, generateSignupLink } from '@/app/admin/users/actions';

export function InviteUserButton() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setMessage({ type: 'error', text: 'Email address is required' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setGeneratedLink(null);

    try {
      // Try sending email invitation first
      const result = await inviteUser(email);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `✓ Invitation email sent to ${email}`,
        });
        setEmail(''); // Clear form
      } else {
        // If email fails, offer to generate manual link
        setMessage({
          type: 'error',
          text: `Failed to send email: ${result.error}. Click "Generate Link" to create a manual signup link.`,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Try generating a manual link instead.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Email address is required' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setGeneratedLink(null);

    try {
      const result = await generateSignupLink(email);

      if (result.success && result.link) {
        setGeneratedLink(result.link);
        setMessage({
          type: 'info',
          text: 'Signup link generated! Copy and send it to the user manually.',
        });
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to generate signup link',
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

  const handleCopyLink = async () => {
    if (generatedLink) {
      try {
        await navigator.clipboard.writeText(generatedLink);
        setMessage({
          type: 'success',
          text: '✓ Link copied to clipboard!',
        });
      } catch (error) {
        setMessage({
          type: 'error',
          text: 'Failed to copy link',
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Form */}
      <form onSubmit={handleInvite} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </button>

          <button
            type="button"
            onClick={handleGenerateLink}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Link
          </button>
        </div>
      </form>

      {/* Status Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg border flex items-start gap-3 ${
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
            <Mail className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Generated Link Display */}
      {generatedLink && (
        <div className="p-4 bg-muted border border-border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Generated Signup Link:</span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-3 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
            >
              <Copy className="h-3 w-3" />
              Copy Link
            </button>
          </div>
          <div className="p-3 bg-background border border-border rounded font-mono text-xs break-all">
            {generatedLink}
          </div>
          <p className="text-xs text-muted-foreground">
            Send this link to {email} - it will allow them to set up their account.
          </p>
        </div>
      )}
    </div>
  );
}
