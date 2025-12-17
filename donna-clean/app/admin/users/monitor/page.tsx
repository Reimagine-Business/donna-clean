import { requireAdmin } from '@/lib/admin/check-admin';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { format, formatDistanceToNow } from 'date-fns';
import { Activity, Clock, AlertCircle } from 'lucide-react';

export default async function UserMonitoringPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  // Get all users
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

  // Get entry counts per user
  const { data: entries } = await supabase
    .from('entries')
    .select('user_id, created_at');

  // Count entries per user
  const entryCounts: Record<string, number> = {};
  const lastEntryDates: Record<string, string> = {};

  entries?.forEach(entry => {
    entryCounts[entry.user_id] = (entryCounts[entry.user_id] || 0) + 1;
    if (!lastEntryDates[entry.user_id] || entry.created_at > lastEntryDates[entry.user_id]) {
      lastEntryDates[entry.user_id] = entry.created_at;
    }
  });

  // Combine data
  const usersWithStats = authUsers?.map(user => ({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    role: user.app_metadata?.role || 'user',
    entryCount: entryCounts[user.id] || 0,
    lastEntryDate: lastEntryDates[user.id],
  })) || [];

  // Calculate stats
  const totalUsers = usersWithStats.length;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeUsers = usersWithStats.filter(u =>
    u.last_sign_in_at && new Date(u.last_sign_in_at) > sevenDaysAgo
  ).length;

  const totalEntries = Object.values(entryCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Monitoring</h1>
        <p className="text-muted-foreground">
          Track user activity and engagement
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="p-6 border rounded-lg bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Activity className="h-6 w-6 text-blue-500" />
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
              <Clock className="h-6 w-6 text-green-500" />
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
              <Activity className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Entries</div>
              <div className="text-3xl font-bold">{totalEntries}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4 font-medium text-sm">Email</th>
              <th className="text-left p-4 font-medium text-sm">Last Login</th>
              <th className="text-left p-4 font-medium text-sm">Last Entry</th>
              <th className="text-right p-4 font-medium text-sm">Total Entries</th>
              <th className="text-center p-4 font-medium text-sm">Status</th>
            </tr>
          </thead>
          <tbody>
            {usersWithStats.map((user) => {
              const daysSinceLogin = user.last_sign_in_at
                ? Math.floor((Date.now() - new Date(user.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24))
                : null;

              const isActive = daysSinceLogin !== null && daysSinceLogin < 7;
              const isInactive = daysSinceLogin !== null && daysSinceLogin > 30;

              return (
                <tr key={user.id} className="border-t hover:bg-muted/50">
                  {/* Email */}
                  <td className="p-4">
                    <div className="font-medium">{user.email}</div>
                    {user.role === 'admin' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-500">
                        Admin
                      </span>
                    )}
                  </td>

                  {/* Last Login */}
                  <td className="p-4 text-sm">
                    {user.last_sign_in_at ? (
                      <div>
                        <div>{format(new Date(user.last_sign_in_at), 'MMM dd, HH:mm')}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </td>

                  {/* Last Entry */}
                  <td className="p-4 text-sm">
                    {user.lastEntryDate ? (
                      <div>
                        <div>{format(new Date(user.lastEntryDate), 'MMM dd')}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(user.lastEntryDate), { addSuffix: true })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No entries</span>
                    )}
                  </td>

                  {/* Entry Count */}
                  <td className="p-4 text-right">
                    <span className="font-semibold text-lg">{user.entryCount}</span>
                  </td>

                  {/* Status */}
                  <td className="p-4 text-center">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-500/10 text-green-500">
                        <Activity className="h-3 w-3" />
                        Active
                      </span>
                    ) : isInactive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-500/10 text-red-500">
                        <AlertCircle className="h-3 w-3" />
                        Inactive
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-500">
                        Moderate
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Activity Legend */}
      <div className="p-4 border rounded-lg bg-muted/50">
        <h3 className="font-semibold mb-3">Activity Status</h3>
        <div className="grid gap-2 md:grid-cols-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span><strong>Active:</strong> Logged in within 7 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span><strong>Moderate:</strong> 7-30 days since login</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span><strong>Inactive:</strong> Over 30 days since login</span>
          </div>
        </div>
      </div>
    </div>
  );
}
