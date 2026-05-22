-- ============================================================================
-- Takween Database Schema
-- Version: 007 — Team Merge Requests
-- Description: Allows teams to request merging into another team within the
--              same project. On acceptance, all source members transfer to the
--              target team and the source team is dissolved.
-- ============================================================================

-- ============================================================================
-- 1. UPDATE NOTIFICATION TYPE CHECK CONSTRAINT
-- ============================================================================

-- Add new merge notification types to the notifications table check constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'request_received',
    'request_accepted',
    'request_rejected',
    'member_removed',
    'member_left',
    'team_closed',
    'team_deleted',
    'ownership_transferred',
    'merge_received',
    'merge_accepted',
    'merge_rejected'
  )
);

-- ============================================================================
-- 2. TEAM MERGE REQUESTS TABLE
-- ============================================================================

CREATE TABLE team_merge_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  target_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate pending requests between the same pair
  CONSTRAINT no_self_merge CHECK (source_team_id <> target_team_id)
);

-- Only one pending request per source→target pair
CREATE UNIQUE INDEX idx_merge_requests_pending
  ON team_merge_requests (source_team_id, target_team_id)
  WHERE status = 'pending';

-- Also prevent the source team from having more than one outgoing pending request
CREATE UNIQUE INDEX idx_merge_requests_source_pending
  ON team_merge_requests (source_team_id)
  WHERE status = 'pending';

CREATE INDEX idx_merge_requests_target ON team_merge_requests(target_team_id);
CREATE INDEX idx_merge_requests_status ON team_merge_requests(status);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE team_merge_requests ENABLE ROW LEVEL SECURITY;

-- Source team owner can view their outgoing requests
CREATE POLICY "Source owner can view merge requests"
  ON team_merge_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = source_team_id AND owner_id = auth.uid()
    )
  );

-- Target team owner can view incoming requests
CREATE POLICY "Target owner can view merge requests"
  ON team_merge_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = target_team_id AND owner_id = auth.uid()
    )
  );

-- Source team owner can create merge requests
CREATE POLICY "Source owner can create merge requests"
  ON team_merge_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams WHERE id = source_team_id AND owner_id = auth.uid()
    )
  );

-- Target team owner can update (accept/reject) merge requests
CREATE POLICY "Target owner can update merge requests"
  ON team_merge_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = target_team_id AND owner_id = auth.uid()
    )
  );

-- Admins can view all merge requests
CREATE POLICY "Admins can view all merge requests"
  ON team_merge_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- 4. STORED PROCEDURE: merge_teams
-- ============================================================================
-- Atomically performs the merge:
--   1. Validate request is pending & teams are on the same project
--   2. Verify combined size <= max_team_size
--   3. Transfer all team_members from source to target (owner becomes member)
--   4. Transfer all manual_members from source to target
--   5. Auto-reject pending join_requests to the source team
--   6. Mark merge request as accepted
--   7. Delete the source team (cascades join_requests via FK)
-- ============================================================================

CREATE OR REPLACE FUNCTION merge_teams(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
  v_request RECORD;
  v_source_team RECORD;
  v_target_team RECORD;
  v_source_count INTEGER;
  v_target_count INTEGER;
  v_max_size INTEGER;
BEGIN
  -- 1. Lock and fetch the merge request
  SELECT * INTO v_request
    FROM team_merge_requests
    WHERE id = p_request_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merge request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Merge request is no longer pending (status: %)', v_request.status;
  END IF;

  -- 2. Fetch both teams
  SELECT * INTO v_source_team FROM teams WHERE id = v_request.source_team_id;
  SELECT * INTO v_target_team FROM teams WHERE id = v_request.target_team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'One or both teams no longer exist';
  END IF;

  IF v_source_team.project_id <> v_target_team.project_id THEN
    RAISE EXCEPTION 'Teams are not in the same project';
  END IF;

  -- 3. Check capacity
  v_source_count := get_team_member_count(v_request.source_team_id);
  v_target_count := get_team_member_count(v_request.target_team_id);

  SELECT max_team_size INTO v_max_size
    FROM projects
    WHERE id = v_target_team.project_id;

  IF (v_source_count + v_target_count) > v_max_size THEN
    RAISE EXCEPTION 'Combined team size (%) exceeds project limit (%)',
      v_source_count + v_target_count, v_max_size;
  END IF;

  -- 4. Transfer registered members (source owner becomes a regular member)
  UPDATE team_members
    SET team_id = v_request.target_team_id,
        role = 'member'
    WHERE team_id = v_request.source_team_id;

  -- 5. Transfer manual members
  UPDATE manual_members
    SET team_id = v_request.target_team_id
    WHERE team_id = v_request.source_team_id;

  -- 6. Auto-reject pending join requests to the source team
  UPDATE join_requests
    SET status = 'rejected'
    WHERE team_id = v_request.source_team_id
      AND status = 'pending';

  -- 7. Mark merge request as accepted
  UPDATE team_merge_requests
    SET status = 'accepted'
    WHERE id = p_request_id;

  -- 8. Delete the source team
  DELETE FROM teams WHERE id = v_request.source_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. UPDATE NOTIFICATION WEBHOOK TRIGGER
-- ============================================================================
-- Extend the existing notification webhook trigger to also fire for
-- merge_received, merge_accepted, merge_rejected notification types.
-- We need to drop and recreate the trigger with the expanded WHEN clause.

DROP TRIGGER IF EXISTS trigger_notifications_send_email ON notifications;

CREATE TRIGGER trigger_notifications_send_email
  AFTER INSERT ON notifications
  FOR EACH ROW
  WHEN (NEW.type IN (
    'request_received',
    'request_accepted',
    'request_rejected',
    'merge_received',
    'merge_accepted',
    'merge_rejected'
  ))
  EXECUTE FUNCTION notify_send_email_webhook();
