-- Migration: Create alerts table for system-generated notifications
-- Date: 2025-12-02
--
-- This migration creates the alerts table for system-generated notifications
-- (low balance, high expenses, budget warnings, etc.)
-- Includes duplicate prevention to avoid creating the same alert multiple times.

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 1: Create alerts table
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Alert content
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Alert metadata
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'critical')),
  priority INTEGER NOT NULL DEFAULT 0,  -- Higher number = higher priority

  -- Read status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Optional entity relationship (e.g., link to an entry)
  related_entity_type TEXT,  -- 'entry', 'settlement', etc.
  related_entity_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alerts IS 'System-generated notifications (low balance, high expenses, etc.)';
COMMENT ON COLUMN alerts.type IS 'Alert severity: info, warning, or critical';
COMMENT ON COLUMN alerts.priority IS 'Higher number = higher priority (0-2)';
COMMENT ON COLUMN alerts.related_entity_type IS 'Optional link to related entity (e.g., entry)';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Prevent duplicate alerts
-- ═══════════════════════════════════════════════════════════════════════

-- Partial unique index: Prevent duplicate unread alerts with same title and user
-- This prevents creating the same alert multiple times (e.g., "Low Balance" spam)
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_unique_unread
ON alerts (user_id, title, type)
WHERE is_read = false;

COMMENT ON INDEX idx_alerts_unique_unread IS
'Prevents duplicate unread alerts with same title and type. Once read, duplicates are allowed for history.';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: Performance indexes
-- ═══════════════════════════════════════════════════════════════════════

-- Speed up queries filtering by user and read status
CREATE INDEX IF NOT EXISTS idx_alerts_user_read
ON alerts(user_id, is_read);

-- Speed up queries filtering by user and type
CREATE INDEX IF NOT EXISTS idx_alerts_user_type
ON alerts(user_id, type);

-- Speed up queries sorting by priority and date
CREATE INDEX IF NOT EXISTS idx_alerts_priority_date
ON alerts(priority DESC, created_at DESC)
WHERE is_read = false;

-- Speed up lookups by related entity
CREATE INDEX IF NOT EXISTS idx_alerts_related_entity
ON alerts(related_entity_type, related_entity_id)
WHERE related_entity_type IS NOT NULL;

COMMENT ON INDEX idx_alerts_user_read IS 'Speeds up queries filtering by user and read status';
COMMENT ON INDEX idx_alerts_user_type IS 'Speeds up queries filtering by user and alert type';
COMMENT ON INDEX idx_alerts_priority_date IS 'Speeds up queries sorting unread alerts by priority';
COMMENT ON INDEX idx_alerts_related_entity IS 'Speeds up lookups by related entity';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: Enable RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own alerts
CREATE POLICY "Users can view own alerts"
ON alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
ON alerts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
ON alerts FOR DELETE
USING (auth.uid() = user_id);

-- System can insert alerts for any user (server-side only)
CREATE POLICY "System can insert alerts"
ON alerts FOR INSERT
WITH CHECK (true);  -- Server-side functions insert with service role

COMMENT ON POLICY "Users can view own alerts" ON alerts IS
'Users can only view their own alerts';
COMMENT ON POLICY "System can insert alerts" ON alerts IS
'System functions can create alerts for users (using service role)';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 5: Grant permissions
-- ═══════════════════════════════════════════════════════════════════════

GRANT SELECT, UPDATE, DELETE ON alerts TO authenticated;
GRANT INSERT ON alerts TO service_role;  -- Only server can create alerts

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 6: Cleanup function for old read alerts
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_old_alerts(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete read alerts older than specified days
  DELETE FROM alerts
  WHERE is_read = true
    AND read_at < (NOW() - (days_to_keep || ' days')::INTERVAL);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_alerts IS
'Deletes read alerts older than specified days (default 30). Returns number of deleted alerts.';

GRANT EXECUTE ON FUNCTION cleanup_old_alerts TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 7: Helper function to create alerts safely (prevents duplicates)
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_alert_safe(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_priority INTEGER DEFAULT 0,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  -- Check if unread alert with same title and type already exists
  SELECT id INTO v_alert_id
  FROM alerts
  WHERE user_id = p_user_id
    AND title = p_title
    AND type = p_type
    AND is_read = false
  LIMIT 1;

  -- If exists, return existing alert ID
  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'alert_id', v_alert_id,
      'created', false,
      'message', 'Alert already exists (unread)'
    );
  END IF;

  -- Create new alert
  INSERT INTO alerts (
    user_id,
    title,
    message,
    type,
    priority,
    related_entity_type,
    related_entity_id
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_priority,
    p_related_entity_type,
    p_related_entity_id
  ) RETURNING id INTO v_alert_id;

  RETURN json_build_object(
    'success', true,
    'alert_id', v_alert_id,
    'created', true,
    'message', 'Alert created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_alert_safe IS
'Creates an alert, preventing duplicates. Returns JSON with success status and alert ID.';

GRANT EXECUTE ON FUNCTION create_alert_safe TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- Verification queries (for testing)
-- ═══════════════════════════════════════════════════════════════════════

-- Check table exists:
-- SELECT tablename FROM pg_tables WHERE tablename = 'alerts';

-- Count alerts by type:
-- SELECT type, is_read, COUNT(*) as count
-- FROM alerts
-- GROUP BY type, is_read;

-- Test duplicate prevention:
-- SELECT create_alert_safe(
--   '0ae874c6-70d8-42d2-8aea-6f1e2feffd45'::UUID,
--   'Test Alert',
--   'This is a test',
--   'info'
-- );
