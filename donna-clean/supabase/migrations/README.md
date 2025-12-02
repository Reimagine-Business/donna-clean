# Database Migrations

This directory contains SQL migration files for the Donna application.

## How to Apply Migrations

### Via Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire content of the migration file
6. Paste it into the SQL Editor
7. Click **Run** (or press Ctrl/Cmd + Enter)

### Migration Files

Migrations are named with the format: `YYYYMMDD_description.sql`

Apply them in chronological order (oldest first).

## Current Migrations

- `20241122_create_settle_entry_function.sql` - Settlement functionality
- `20251123184609_create_reminders_table.sql` - Reminders system
- `20251130_add_updated_at_column.sql` - Timestamp tracking
- `20251130_fix_advance_settlement_double_counting.sql` - Settlement fixes
- `20251202_add_settlement_tracking_columns.sql` - Enhanced settlement tracking
- `20251202_create_alerts_table.sql` - Alerts system
- `20251202_create_settlement_history_table.sql` - Settlement history
- `20251202_fix_duplicate_reminders.sql` - Reminder deduplication
- **`20251202_create_parties_table.sql`** - ⭐ **NEW: Customers & Vendors feature**

## Verifying Migrations

After applying a migration, you can verify it was successful by:

1. Checking the **Table Editor** in Supabase to see if new tables exist
2. Running verification queries (often included at the end of migration files)
3. Testing the feature in the application

## Rollback

If you need to undo a migration, you'll need to manually write and execute the reverse SQL commands.

## Important Notes

- ✅ All migrations use `IF NOT EXISTS` clauses to be idempotent
- ✅ Migrations are backward-compatible by default
- ✅ Row Level Security (RLS) is enabled on all user data tables
- ⚠️ Always backup your database before applying migrations to production
