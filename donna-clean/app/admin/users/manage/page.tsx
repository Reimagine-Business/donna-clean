import { requireAdmin } from '@/lib/admin/check-admin';
import { UserPlus, AlertCircle } from 'lucide-react';
import { CreateUserDirect } from '@/components/admin/create-user-direct';

export default async function UserManagementPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Create and manage user accounts
          </p>
        </div>
      </div>

      {/* Create User Section */}
      <div className="p-6 border rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <UserPlus className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Create New User</h2>
            <p className="text-sm text-muted-foreground">
              Create a user account directly (works from mobile!)
            </p>
          </div>
        </div>

        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-4">
          <p className="text-sm">
            Create user accounts instantly with a temporary password. Users can login immediately and change their password. Standard user access (no admin privileges).
          </p>
        </div>

        <CreateUserDirect />
      </div>

      {/* Future Features */}
      <div className="p-6 border rounded-lg bg-muted/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-semibold mb-2">Additional Features Coming Soon</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View all registered users</li>
              <li>• Deactivate user accounts</li>
              <li>• Reset user passwords</li>
              <li>• Manage user permissions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
