'use client'

import { useState } from 'react';
import { SiteHeader } from "@/components/site-header";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { TopNavMobile } from "@/components/navigation/top-nav-mobile";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminUsersPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isInviting, setIsInviting] = useState(false);

  // Fetch current user
  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteStatus({ type: null, message: '' });
    setIsInviting(true);

    try {
      // Use Supabase Admin API to invite user
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${window.location.origin}/auth/login`,
      });

      if (error) {
        setInviteStatus({
          type: 'error',
          message: error.message || 'Failed to send invitation'
        });
      } else {
        setInviteStatus({
          type: 'success',
          message: `Invitation sent successfully to ${email}`
        });
        setEmail('');
      }
    } catch (err: any) {
      setInviteStatus({
        type: 'error',
        message: err.message || 'An error occurred while sending the invitation'
      });
    } finally {
      setIsInviting(false);
    }
  };

  if (!userData) {
    return (
      <main className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
        <div className="flex flex-col gap-10">
          <SiteHeader />
          <TopNavMobile pageTitle="Admin - Users" />
          <section className="px-4 pb-12 md:px-8">
            <div className="mx-auto w-full max-w-4xl">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </section>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <div className="flex flex-col gap-10">
        <SiteHeader />
        <TopNavMobile pageTitle="Admin - Users" userEmail={userData.email || undefined} />

        <section className="px-4 pb-12 md:px-8">
          <div className="mx-auto w-full max-w-4xl space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-muted-foreground mt-2">
                Invite new users to the platform
              </p>
            </div>

            {/* Admin Notice */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-purple-200">
                    Admin Access Required
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This page is for administrators only. Public sign-ups are disabled.
                  </p>
                </div>
              </div>
            </div>

            {/* Invite User Form */}
            <Card>
              <CardHeader>
                <CardTitle>Invite New User</CardTitle>
                <CardDescription>
                  Send an invitation email to a new user. They will receive a link to set up their account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isInviting}
                      className="max-w-md"
                    />
                    <p className="text-sm text-muted-foreground">
                      The user will receive an email with instructions to set up their account.
                    </p>
                  </div>

                  {inviteStatus.type && (
                    <div
                      className={`p-4 rounded-lg ${
                        inviteStatus.type === 'success'
                          ? 'bg-green-500/10 border border-green-500/20 text-green-200'
                          : 'bg-red-500/10 border border-red-500/20 text-red-200'
                      }`}
                    >
                      <p className="text-sm">{inviteStatus.message}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isInviting}
                    className="w-full md:w-auto"
                  >
                    {isInviting ? 'Sending Invitation...' : 'Send Invitation'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>How Invitations Work</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold">
                    1
                  </span>
                  <p>
                    Enter the email address of the person you want to invite
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold">
                    2
                  </span>
                  <p>
                    They receive an email with a secure invitation link
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold">
                    3
                  </span>
                  <p>
                    They click the link and set their password to complete registration
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold">
                    4
                  </span>
                  <p>
                    They can now log in and access the application
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
