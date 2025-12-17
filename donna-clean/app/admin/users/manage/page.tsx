import { requireAdmin } from '@/lib/admin/check-admin';
import { Mail, AlertCircle } from 'lucide-react';

export default async function UserManagementPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Invite and manage user accounts
          </p>
        </div>
      </div>

      {/* Invite User Section */}
      <div className="p-6 border rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Mail className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Invite New User</h2>
            <p className="text-sm text-muted-foreground">
              Send an email invitation to a new user
            </p>
          </div>
        </div>

        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
          <p className="text-sm">
            New users will receive an email with a link to set up their account. They will have standard user access (no admin privileges).
          </p>
        </div>

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              placeholder="user@example.com"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            Send Invitation
          </button>
        </form>
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
