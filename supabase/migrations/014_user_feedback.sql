-- ============================================================================
-- Takween Database Schema
-- Version: 014 — User Feedback
-- Description: Creates the feedback table to store user suggestions and requests.
-- ============================================================================

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Bug', 'Feature', 'General')),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Read', 'Resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quick fetching
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Admins can do anything
CREATE POLICY "Admins can manage all feedback"
  ON feedback FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Authenticated users can insert feedback
CREATE POLICY "Authenticated users can insert feedback"
  ON feedback FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- 3. Users can view their own feedback (optional, but good practice)
CREATE POLICY "Users can view their own feedback"
  ON feedback FOR SELECT
  USING (
    auth.uid() = user_id
  );
