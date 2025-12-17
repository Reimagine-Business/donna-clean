import { requireAdmin } from '@/lib/admin/check-admin';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { Users, Activity, FileText } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  // Get basic statistics
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  const totalUsers = authUsers?.length || 0;

  // Get active users (logged in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeUsers = authUsers?.filter(u =>
    u.last_sign_in_at && new Date(u.last_sign_in_at) > sevenDaysAgo
  ).length || 0;

  // Get total entries
  const { count: totalEntries } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          System administration for The Donna
        </p>
        <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-sm">
            🔒 <strong>Admin Access:</strong> You are logged in as reimaginebusiness2025@gmail.com
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="p-6 border rounded-lg bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Users</div>
              <div className="text-3xl font-bold">{totalUsers}</div>
            </div>
          </div>
        </div>

        <div className="p-6 border rounded-lg bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <Activity className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Active (7d)</div>
              <div className="text-3xl font-bold">{activeUsers}</div>
            </div>
          </div>
        </div>

        <div className="p-6 border rounded-lg bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10">
              <FileText className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Entries</div>
              <div className="text-3xl font-bold">{totalEntries || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Actions - ONLY TWO */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Admin Tools</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* User Management */}
          <Link
            href="/admin/users/manage"
            className="p-6 border rounded-lg hover:bg-muted transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">User Management</h3>
                <p className="text-sm text-muted-foreground">
                  Invite new users and manage user accounts
                </p>
              </div>
            </div>
          </Link>

          {/* User Monitoring */}
          <Link
            href="/admin/users/monitor"
            className="p-6 border rounded-lg hover:bg-muted transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-green-500/10 group-hover:bg-green-500/20">
                <Activity className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">User Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  View user activity, logins, and entry statistics
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
