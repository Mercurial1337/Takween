-- ============================================================================
-- Takween Database Schema
-- Version: 009 — Student Directory & Team Invites
-- Description: Adds "looking for a team" flag to profiles, creates team_invites
--              table with full workflow support, and auto-clears LFT on team join.
-- ============================================================================

-- 1. Add looking-for-team flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_looking_for_team BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_looking_for_team
  ON public.profiles (is_looking_for_team)
  WHERE is_looking_for_team = true;

-- 2. Create team_invites table (mirrors join_requests, but owner → student)
CREATE TABLE IF NOT EXISTS public.team_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one pending invite per user per team
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invites_pending
  ON public.team_invites (team_id, user_id)
  WHERE status = 'pending';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_invites_team ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_user ON public.team_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON public.team_invites(status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_team_invites_updated_at ON public.team_invites;
CREATE TRIGGER set_team_invites_updated_at
  BEFORE UPDATE ON public.team_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Add invite notification types to CHECK constraint
-- We need to drop and recreate the CHECK constraint on notifications.type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
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
  'merge_rejected',
  'invite_received',
  'invite_accepted',
  'invite_rejected'
));

-- 4. RLS for team_invites
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites addressed to them
DROP POLICY IF EXISTS "Users can view own invites" ON public.team_invites;
CREATE POLICY "Users can view own invites"
  ON public.team_invites FOR SELECT
  USING (auth.uid() = user_id);

-- Team owners can view invites they sent
DROP POLICY IF EXISTS "Team owners can view sent invites" ON public.team_invites;
CREATE POLICY "Team owners can view sent invites"
  ON public.team_invites FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
  );

-- Team owners can create invites for their teams
DROP POLICY IF EXISTS "Team owners can create invites" ON public.team_invites;
CREATE POLICY "Team owners can create invites"
  ON public.team_invites FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
  );

-- Invited users can update (accept/reject) their own invites
DROP POLICY IF EXISTS "Users can update own invites" ON public.team_invites;
CREATE POLICY "Users can update own invites"
  ON public.team_invites FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Auto-clear is_looking_for_team when a student joins a team
CREATE OR REPLACE FUNCTION public.clear_looking_for_team()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET is_looking_for_team = false
  WHERE id = NEW.user_id AND is_looking_for_team = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_clear_looking_for_team ON public.team_members;
CREATE TRIGGER trigger_clear_looking_for_team
  AFTER INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_looking_for_team();
