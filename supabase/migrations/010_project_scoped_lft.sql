-- ============================================================================
-- Takween Database Schema
-- Version: 010 — Project-Scoped Student Availability
-- Description: Migrates the global "looking for a team" flag into a project-specific
--              table, updates the auto-clear trigger, and removes the old column.
-- ============================================================================

-- 1. Create project_seekers table
CREATE TABLE IF NOT EXISTS public.project_seekers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- A user can only seek a team once per project
  UNIQUE (project_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_seekers_project ON public.project_seekers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_seekers_user ON public.project_seekers(user_id);

-- 2. RLS for project_seekers
ALTER TABLE public.project_seekers ENABLE ROW LEVEL SECURITY;

-- Anyone can read project seekers
CREATE POLICY "Anyone can view project seekers"
  ON public.project_seekers FOR SELECT
  USING (true);

-- Users can insert their own seeker record (must be a student)
CREATE POLICY "Students can insert own seeker record"
  ON public.project_seekers FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
  );

-- Users can delete their own seeker record
CREATE POLICY "Users can delete own seeker record"
  ON public.project_seekers FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Update the auto-clear trigger
-- Drop the old trigger entirely as we are rewriting it
DROP TRIGGER IF EXISTS trigger_clear_looking_for_team ON public.team_members;

CREATE OR REPLACE FUNCTION public.clear_project_seeker_on_join()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Get the project_id of the team the user just joined
  SELECT project_id INTO v_project_id FROM public.teams WHERE id = NEW.team_id;
  
  IF v_project_id IS NOT NULL THEN
    -- Delete the user's project_seeker record for this specific project
    DELETE FROM public.project_seekers
    WHERE user_id = NEW.user_id AND project_id = v_project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_clear_project_seeker_on_join
  AFTER INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_project_seeker_on_join();

-- 4. Cleanup old profiles column
-- Safely drop the column (this will also drop the index we created in 009)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_looking_for_team;
