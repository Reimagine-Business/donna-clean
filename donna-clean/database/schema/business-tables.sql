-- =====================================================
-- DONNA CLEAN - BUSINESS TRACKING DATABASE SCHEMA
-- =====================================================
-- This schema creates all necessary tables, policies, functions,
-- and triggers for the business tracking application.
--
-- IMPORTANT: Run this script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- ENTRIES TABLE
-- Stores all financial transactions (income and expenses)
CREATE TABLE IF NOT EXISTS public.entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT CHECK (payment_method IN ('cash', 'bank', 'upi', 'card', 'cheque', 'other')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for entries table
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON public.entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON public.entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_type ON public.entries(type);
CREATE INDEX IF NOT EXISTS idx_entries_category ON public.entries(category);
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON public.entries(user_id, date DESC);

-- Add comment
COMMENT ON TABLE public.entries IS 'Stores all financial transactions for business tracking';

-- CATEGORIES TABLE
-- Stores custom categories defined by users
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    color TEXT DEFAULT '#7c3aed',
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on (user_id, name, type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name_type
    ON public.categories(user_id, name, type);

-- Create index for categories table
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);

-- Add comment
COMMENT ON TABLE public.categories IS 'User-defined categories for organizing transactions';

-- ALERTS TABLE
-- Stores system-generated and custom alerts/reminders
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'critical', 'success')),
    is_read BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    related_entity_type TEXT,
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for alerts table
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON public.alerts(user_id, is_read) WHERE is_read = false;

-- Add comment
COMMENT ON TABLE public.alerts IS 'System and user alerts for important business notifications';

-- =====================================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREATE RLS POLICIES
-- =====================================================

-- ENTRIES POLICIES
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own entries" ON public.entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON public.entries;
DROP POLICY IF EXISTS "Users can update own entries" ON public.entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON public.entries;

-- Create new policies
CREATE POLICY "Users can view own entries"
    ON public.entries
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
    ON public.entries
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
    ON public.entries
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
    ON public.entries
    FOR DELETE
    USING (auth.uid() = user_id);

-- CATEGORIES POLICIES
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;

-- Create new policies
CREATE POLICY "Users can view own categories"
    ON public.categories
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
    ON public.categories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
    ON public.categories
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
    ON public.categories
    FOR DELETE
    USING (auth.uid() = user_id);

-- ALERTS POLICIES
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "System can insert alerts" ON public.alerts;

-- Create new policies
CREATE POLICY "Users can view own alerts"
    ON public.alerts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
    ON public.alerts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert alerts"
    ON public.alerts
    FOR INSERT
    WITH CHECK (true); -- Allow system (service role) to insert alerts

-- =====================================================
-- 4. CREATE DEFAULT CATEGORIES FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_default_categories(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert default income categories
    INSERT INTO public.categories (user_id, name, type, color, icon)
    VALUES
        (p_user_id, 'Sales', 'income', '#10b981', '💰'),
        (p_user_id, 'Services', 'income', '#3b82f6', '🛠️'),
        (p_user_id, 'Other Income', 'income', '#8b5cf6', '💵')
    ON CONFLICT (user_id, name, type) DO NOTHING;

    -- Insert default expense categories
    INSERT INTO public.categories (user_id, name, type, color, icon)
    VALUES
        (p_user_id, 'COGS', 'expense', '#ef4444', '📦'),
        (p_user_id, 'Rent', 'expense', '#f59e0b', '🏠'),
        (p_user_id, 'Salaries', 'expense', '#ec4899', '👥'),
        (p_user_id, 'Utilities', 'expense', '#06b6d4', '⚡'),
        (p_user_id, 'Marketing', 'expense', '#8b5cf6', '📢'),
        (p_user_id, 'Other Expenses', 'expense', '#6b7280', '📝')
    ON CONFLICT (user_id, name, type) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.create_default_categories IS 'Creates default income and expense categories for new users';

-- =====================================================
-- 5. CREATE ALERT GENERATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_and_create_alerts(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_income DECIMAL(12,2);
    v_total_expenses DECIMAL(12,2);
    v_cash_balance DECIMAL(12,2);
    v_month_start DATE;
    v_month_end DATE;
BEGIN
    -- Calculate current month date range
    v_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_month_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;

    -- Calculate total income for current month
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_income
    FROM public.entries
    WHERE user_id = p_user_id
        AND type = 'income'
        AND date >= v_month_start
        AND date <= v_month_end;

    -- Calculate total expenses for current month
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_expenses
    FROM public.entries
    WHERE user_id = p_user_id
        AND type = 'expense'
        AND date >= v_month_start
        AND date <= v_month_end;

    -- Calculate cash balance (cash payment method entries)
    SELECT COALESCE(
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0
    )
    INTO v_cash_balance
    FROM public.entries
    WHERE user_id = p_user_id
        AND payment_method = 'cash';

    -- Alert 1: Expenses exceed income
    IF v_total_expenses > v_total_income THEN
        INSERT INTO public.alerts (user_id, title, message, type, priority)
        VALUES (
            p_user_id,
            'Expenses Exceed Income',
            'Your expenses (₹' || TO_CHAR(v_total_expenses, 'FM999,999,999.00') ||
            ') exceed your income (₹' || TO_CHAR(v_total_income, 'FM999,999,999.00') ||
            ') this month.',
            'warning',
            1
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- Alert 2: Low cash balance
    IF v_cash_balance < 10000 AND v_cash_balance > 0 THEN
        INSERT INTO public.alerts (user_id, title, message, type, priority)
        VALUES (
            p_user_id,
            'Low Cash Balance',
            'Your cash balance is low: ₹' || TO_CHAR(v_cash_balance, 'FM999,999,999.00') ||
            '. Consider managing cash flow.',
            'info',
            0
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- Alert 3: Negative cash balance
    IF v_cash_balance < 0 THEN
        INSERT INTO public.alerts (user_id, title, message, type, priority)
        VALUES (
            p_user_id,
            'Negative Cash Balance',
            'URGENT: Your cash balance is negative: ₹' || TO_CHAR(v_cash_balance, 'FM999,999,999.00'),
            'critical',
            2
        )
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.check_and_create_alerts IS 'Checks business metrics and creates alerts based on predefined rules';

-- =====================================================
-- 6. CREATE LARGE EXPENSE ALERT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.alert_on_large_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only for expense entries > ₹50,000
    IF NEW.type = 'expense' AND NEW.amount > 50000 THEN
        INSERT INTO public.alerts (user_id, title, message, type, priority, related_entity_type, related_entity_id)
        VALUES (
            NEW.user_id,
            'Large Expense Recorded',
            'A large expense of ₹' || TO_CHAR(NEW.amount, 'FM999,999,999.00') ||
            ' was recorded in ' || NEW.category ||
            CASE WHEN NEW.description IS NOT NULL
                THEN ' - ' || NEW.description
                ELSE ''
            END,
            'info',
            0,
            'entry',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.alert_on_large_expense IS 'Trigger function that creates an alert when a large expense (>₹50,000) is added';

-- =====================================================
-- 7. CREATE UPDATE TIMESTAMP FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column IS 'Automatically updates the updated_at timestamp when a row is modified';

-- =====================================================
-- 8. CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_entries_updated_at ON public.entries;
DROP TRIGGER IF EXISTS trigger_alert_on_large_expense ON public.entries;

-- Trigger to update updated_at timestamp on entries
CREATE TRIGGER update_entries_updated_at
    BEFORE UPDATE ON public.entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create alert on large expense
CREATE TRIGGER trigger_alert_on_large_expense
    AFTER INSERT ON public.entries
    FOR EACH ROW
    EXECUTE FUNCTION public.alert_on_large_expense();

-- =====================================================
-- 9. CREATE TRIGGER FOR NEW USER SETUP
-- =====================================================

-- Function to setup new user data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create default categories for new user
    PERFORM public.create_default_categories(NEW.id);

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically sets up default categories when a new user signs up';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 10. SAMPLE SEED DATA (DEVELOPMENT ONLY)
-- =====================================================
-- Uncomment the section below to add sample data for testing
-- IMPORTANT: Only use this in development/testing environments

/*
-- Get the current user ID (replace with actual user ID)
DO $$
DECLARE
    v_user_id UUID := auth.uid(); -- Replace with your test user ID if needed
BEGIN
    -- Only proceed if user_id is valid
    IF v_user_id IS NOT NULL THEN
        -- Create sample income entries
        INSERT INTO public.entries (user_id, type, category, amount, description, date, payment_method, notes)
        VALUES
            (v_user_id, 'income', 'Sales', 150000.00, 'Product sales', CURRENT_DATE - 5, 'bank', 'Monthly sales revenue'),
            (v_user_id, 'income', 'Services', 75000.00, 'Consulting services', CURRENT_DATE - 10, 'upi', 'Client ABC project'),
            (v_user_id, 'income', 'Sales', 220000.00, 'Online orders', CURRENT_DATE - 15, 'bank', 'E-commerce sales'),
            (v_user_id, 'income', 'Other Income', 25000.00, 'Investment return', CURRENT_DATE - 20, 'bank', 'Dividend payment');

        -- Create sample expense entries
        INSERT INTO public.entries (user_id, type, category, amount, description, date, payment_method, notes)
        VALUES
            (v_user_id, 'expense', 'COGS', 80000.00, 'Raw materials', CURRENT_DATE - 7, 'bank', 'Supplier payment'),
            (v_user_id, 'expense', 'Rent', 45000.00, 'Office rent', CURRENT_DATE - 1, 'bank', 'Monthly rent'),
            (v_user_id, 'expense', 'Salaries', 120000.00, 'Staff salaries', CURRENT_DATE - 3, 'bank', '3 employees'),
            (v_user_id, 'expense', 'Utilities', 8500.00, 'Electricity bill', CURRENT_DATE - 12, 'upi', 'Monthly utility'),
            (v_user_id, 'expense', 'Marketing', 35000.00, 'Social media ads', CURRENT_DATE - 18, 'card', 'Facebook & Google ads'),
            (v_user_id, 'expense', 'Other Expenses', 12000.00, 'Office supplies', CURRENT_DATE - 8, 'cash', 'Stationery and misc');

        -- Generate alerts based on the sample data
        PERFORM public.check_and_create_alerts(v_user_id);

        RAISE NOTICE 'Sample data created successfully for user %', v_user_id;
    ELSE
        RAISE NOTICE 'No valid user ID found. Please set v_user_id variable.';
    END IF;
END;
$$;
*/

-- =====================================================
-- 11. HELPFUL QUERIES
-- =====================================================

-- View all entries for current user
-- SELECT * FROM public.entries WHERE user_id = auth.uid() ORDER BY date DESC;

-- View monthly summary
-- SELECT
--     type,
--     TO_CHAR(SUM(amount), 'FM999,999,999.00') as total
-- FROM public.entries
-- WHERE user_id = auth.uid()
--     AND date >= DATE_TRUNC('month', CURRENT_DATE)
-- GROUP BY type;

-- View unread alerts
-- SELECT * FROM public.alerts
-- WHERE user_id = auth.uid() AND is_read = false
-- ORDER BY priority DESC, created_at DESC;

-- View categories
-- SELECT * FROM public.categories WHERE user_id = auth.uid() ORDER BY type, name;

-- =====================================================
-- SCHEMA SETUP COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify tables are created: Check Tables tab
-- 3. Verify RLS policies: Check Authentication > Policies
-- 4. Test with your application
-- 5. Uncomment sample data section for development testing
-- =====================================================
