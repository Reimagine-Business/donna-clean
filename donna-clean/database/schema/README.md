# Database Schema Documentation

## Overview

This directory contains the complete database schema for the Donna Clean business tracking application. The schema is designed for Supabase (PostgreSQL) and includes tables, Row Level Security (RLS) policies, functions, triggers, and indexes.

## Files

- `business-tables.sql` - Complete database schema with tables, policies, functions, and triggers

## Quick Start

### 1. Run the Schema Script

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `business-tables.sql`
5. Click **Run** to execute

### 2. Verify Installation

Check that all tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('entries', 'categories', 'alerts');
```

Expected result: 3 tables (entries, categories, alerts)

### 3. Test RLS Policies

Verify RLS is enabled:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('entries', 'categories', 'alerts');
```

All tables should show `rowsecurity = true`

## Database Schema

### Tables

#### 1. ENTRIES

Stores all financial transactions (income and expenses).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | References auth.users(id) |
| `type` | TEXT | 'income' or 'expense' |
| `category` | TEXT | Category name |
| `amount` | DECIMAL(12,2) | Transaction amount (supports up to ₹99,99,99,999.99) |
| `description` | TEXT | Optional description |
| `date` | DATE | Transaction date |
| `payment_method` | TEXT | 'cash', 'bank', 'upi', 'card', 'cheque', 'other' |
| `notes` | TEXT | Additional notes |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

**Indexes:**
- `idx_entries_user_id` - User lookups
- `idx_entries_date` - Date-based queries
- `idx_entries_type` - Filter by income/expense
- `idx_entries_category` - Category filtering
- `idx_entries_user_date` - User + date (most common query pattern)

#### 2. CATEGORIES

Stores user-defined categories for organizing transactions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | References auth.users(id) |
| `name` | TEXT | Category name |
| `type` | TEXT | 'income' or 'expense' |
| `color` | TEXT | Hex color code (default: #7c3aed) |
| `icon` | TEXT | Icon name/emoji |
| `created_at` | TIMESTAMP | Record creation time |

**Constraints:**
- Unique constraint on `(user_id, name, type)` - prevents duplicate categories per user

**Default Categories** (auto-created for new users):
- **Income:** Sales, Services, Other Income
- **Expense:** COGS, Rent, Salaries, Utilities, Marketing, Other Expenses

#### 3. ALERTS

Stores system-generated and custom alerts/reminders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | References auth.users(id) |
| `title` | TEXT | Alert title |
| `message` | TEXT | Alert message/description |
| `type` | TEXT | 'info', 'warning', 'critical', 'success' |
| `is_read` | BOOLEAN | Read status (default: false) |
| `priority` | INTEGER | Priority level (default: 0, higher = more important) |
| `related_entity_type` | TEXT | Optional reference type ('entry', 'category', etc.) |
| `related_entity_id` | UUID | Optional reference ID |
| `created_at` | TIMESTAMP | Alert creation time |

**Indexes:**
- `idx_alerts_user_id` - User lookups
- `idx_alerts_is_read` - Filter by read status
- `idx_alerts_created_at` - Sort by date
- `idx_alerts_user_unread` - Efficient unread alerts query

### Row Level Security (RLS) Policies

All tables have RLS enabled with the following policies:

#### ENTRIES Policies
- ✅ Users can view own entries only
- ✅ Users can insert own entries only
- ✅ Users can update own entries only
- ✅ Users can delete own entries only

#### CATEGORIES Policies
- ✅ Users can view own categories only
- ✅ Users can insert own categories only
- ✅ Users can update own categories only
- ✅ Users can delete own categories only

#### ALERTS Policies
- ✅ Users can view own alerts only
- ✅ Users can update own alerts (mark as read)
- ✅ System can insert alerts (service role)

### Functions

#### 1. `create_default_categories(p_user_id UUID)`

Creates default income and expense categories for a new user.

**Usage:**
```sql
SELECT create_default_categories('user-uuid-here');
```

**Default Categories Created:**
- **Income:** Sales (💰), Services (🛠️), Other Income (💵)
- **Expense:** COGS (📦), Rent (🏠), Salaries (👥), Utilities (⚡), Marketing (📢), Other Expenses (📝)

#### 2. `check_and_create_alerts(p_user_id UUID)`

Analyzes business metrics and creates alerts based on predefined rules.

**Alert Rules:**
1. **Expenses Exceed Income** (Warning) - Triggers when monthly expenses > income
2. **Low Cash Balance** (Info) - Triggers when cash balance < ₹10,000
3. **Negative Cash Balance** (Critical) - Triggers when cash balance < 0

**Usage:**
```sql
SELECT check_and_create_alerts('user-uuid-here');
```

#### 3. `alert_on_large_expense()`

Trigger function that creates an alert when a large expense (>₹50,000) is added.

**Automatically called** when inserting entries (via trigger).

#### 4. `update_updated_at_column()`

Automatically updates the `updated_at` timestamp when a row is modified.

**Automatically called** when updating entries (via trigger).

#### 5. `handle_new_user()`

Sets up default categories when a new user signs up.

**Automatically called** when a new user is created in `auth.users` (via trigger).

### Triggers

#### 1. `update_entries_updated_at`
- **Table:** entries
- **Event:** BEFORE UPDATE
- **Function:** update_updated_at_column()
- **Purpose:** Automatically updates updated_at timestamp

#### 2. `trigger_alert_on_large_expense`
- **Table:** entries
- **Event:** AFTER INSERT
- **Function:** alert_on_large_expense()
- **Purpose:** Creates alert for large expenses (>₹50,000)

#### 3. `on_auth_user_created`
- **Table:** auth.users
- **Event:** AFTER INSERT
- **Function:** handle_new_user()
- **Purpose:** Sets up default categories for new users

## Sample Data (Development Only)

The schema includes commented-out sample data for testing. To use it:

1. Uncomment the section in `business-tables.sql` (search for "SAMPLE SEED DATA")
2. Replace `v_user_id` with your test user's UUID
3. Run the script

**Sample data includes:**
- 4 income entries (Sales, Services, Other Income)
- 6 expense entries (COGS, Rent, Salaries, Utilities, Marketing, Other Expenses)
- Auto-generated alerts based on the sample data

## Common Queries

### View All Entries
```sql
SELECT * FROM public.entries
WHERE user_id = auth.uid()
ORDER BY date DESC;
```

### Monthly Summary
```sql
SELECT
    type,
    TO_CHAR(SUM(amount), 'FM999,999,999.00') as total
FROM public.entries
WHERE user_id = auth.uid()
    AND date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY type;
```

### View Unread Alerts
```sql
SELECT * FROM public.alerts
WHERE user_id = auth.uid() AND is_read = false
ORDER BY priority DESC, created_at DESC;
```

### View Categories
```sql
SELECT * FROM public.categories
WHERE user_id = auth.uid()
ORDER BY type, name;
```

### Cash Balance
```sql
SELECT
    TO_CHAR(
        COALESCE(
            SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END),
            0
        ),
        'FM999,999,999.00'
    ) as cash_balance
FROM public.entries
WHERE user_id = auth.uid()
    AND payment_method = 'cash';
```

### Expense Breakdown by Category
```sql
SELECT
    category,
    TO_CHAR(SUM(amount), 'FM999,999,999.00') as total,
    COUNT(*) as transaction_count
FROM public.entries
WHERE user_id = auth.uid()
    AND type = 'expense'
    AND date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY category
ORDER BY SUM(amount) DESC;
```

## Maintenance

### Regenerate Alerts
To regenerate alerts for all users (run as service role):

```sql
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN
        SELECT id FROM auth.users
    LOOP
        PERFORM check_and_create_alerts(user_record.id);
    END LOOP;
END;
$$;
```

### Clear Old Alerts
To remove read alerts older than 30 days:

```sql
DELETE FROM public.alerts
WHERE is_read = true
    AND created_at < NOW() - INTERVAL '30 days';
```

### Backup Data
Always backup before making schema changes:

```sql
-- Export to CSV (from Supabase dashboard)
-- OR use pg_dump for full backup
```

## Migration Strategy

For future schema changes:

1. Create a new migration file (e.g., `migration-001-add-column.sql`)
2. Test on development environment first
3. Use transactions for rollback safety
4. Update this README with changes

## Troubleshooting

### Issue: RLS blocks all queries
**Solution:** Ensure user is authenticated and policies use `auth.uid()`

### Issue: Duplicate category errors
**Solution:** Check unique constraint on `(user_id, name, type)`

### Issue: Alerts not generating
**Solution:** Manually run `check_and_create_alerts(user_id)` and check logs

### Issue: Timestamps not updating
**Solution:** Verify trigger `update_entries_updated_at` exists and is enabled

## Security Considerations

✅ **Row Level Security (RLS)** - Enabled on all tables
✅ **User Isolation** - Users can only access their own data
✅ **Secure Functions** - Functions use `SECURITY DEFINER` where needed
✅ **Input Validation** - CHECK constraints on critical fields
✅ **Cascade Deletes** - User data removed when user account deleted

## Performance Optimization

- ✅ Strategic indexes on frequently queried columns
- ✅ Composite index on `(user_id, date)` for common query patterns
- ✅ Partial index on unread alerts
- ✅ Efficient RLS policies

## Support

For issues or questions:
1. Check this README
2. Review Supabase logs (Dashboard > Logs)
3. Test queries in SQL Editor
4. Contact development team

---

**Last Updated:** November 2024
**Schema Version:** 1.0
**PostgreSQL Version:** 15+
**Supabase Compatible:** Yes
