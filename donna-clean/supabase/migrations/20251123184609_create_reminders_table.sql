-- Create reminders table
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,

  -- Category (4 options)
  category TEXT NOT NULL CHECK (category IN ('bills', 'task', 'advance_settlement', 'others')),

  -- Frequency
  frequency TEXT NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time', 'weekly', 'monthly', 'quarterly', 'annually')),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at TIMESTAMPTZ,

  -- For recurring reminders
  next_due_date DATE,
  parent_reminder_id UUID REFERENCES reminders(id), -- Links recurring instances

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
ON reminders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
ON reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
ON reminders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
ON reminders FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_reminders_user_date ON reminders(user_id, due_date);
CREATE INDEX idx_reminders_status ON reminders(user_id, status);
CREATE INDEX idx_reminders_category ON reminders(user_id, category);
