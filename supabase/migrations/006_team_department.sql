-- ============================================================================
-- Takween Database Schema
-- Version: 006 — Team Department Restriction
-- Description: Add department to profiles and teams, drop project team uniqueness,
--              and enforce department-level segregation.
-- ============================================================================

-- 1. Add department_id columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_teams_department ON public.teams(department_id);

-- 2. Drop uniqueness constraint on teams(project_id)
-- Note: Supabase/PostgreSQL usually names the constraint matching the UNIQUE keyword
-- as "teams_project_id_key" or "teams_project_id_uniq". We cover potential names.
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_project_id_key;
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_project_id_uniq;

-- 3. Update the handle_new_user() trigger function to map department_id from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_skill_name TEXT;
  v_skill_id UUID;
  v_skills_array JSONB;
  i INT;
BEGIN
  -- Insert user profile
  INSERT INTO public.profiles (id, full_name, email, whatsapp_number, level_id, department_id, linkedin_url, github_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', ''),
    NULLIF(NEW.raw_user_meta_data->>'level_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'department_id', '')::uuid,
    NEW.raw_user_meta_data->>'linkedin_url',
    NEW.raw_user_meta_data->>'github_url',
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    whatsapp_number = EXCLUDED.whatsapp_number,
    level_id = EXCLUDED.level_id,
    department_id = EXCLUDED.department_id,
    linkedin_url = EXCLUDED.linkedin_url,
    github_url = EXCLUDED.github_url;

  -- Handle skills if provided in metadata
  v_skills_array := NEW.raw_user_meta_data->'skills';
  IF v_skills_array IS NOT NULL AND jsonb_array_length(v_skills_array) > 0 THEN
    FOR i IN 0 .. jsonb_array_length(v_skills_array) - 1 LOOP
      v_skill_name := jsonb_extract_path_text(v_skills_array, i::text);
      
      IF v_skill_name IS NOT NULL AND v_skill_name <> '' THEN
        -- Insert skill if it doesn't exist
        INSERT INTO public.skills (name, is_predefined)
        VALUES (v_skill_name, false)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_skill_id;

        -- Link profile to the skill
        INSERT INTO public.profile_skills (profile_id, skill_id)
        VALUES (NEW.id, v_skill_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to automatically set team department to owner's department
CREATE OR REPLACE FUNCTION public.set_team_department()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.department_id IS NULL THEN
    SELECT department_id INTO NEW.department_id
    FROM public.profiles
    WHERE id = NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_team_department ON public.teams;
CREATE TRIGGER trigger_set_team_department
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_team_department();

-- 5. Create trigger to enforce at most one team membership per project
CREATE OR REPLACE FUNCTION public.check_team_membership_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Get the project ID of the team they are trying to join
  SELECT project_id INTO v_project_id FROM public.teams WHERE id = NEW.team_id;

  -- Check if they are already in a team for this project
  IF EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.user_id = NEW.user_id AND t.project_id = v_project_id AND tm.team_id <> NEW.team_id
  ) THEN
    RAISE EXCEPTION 'You are already a member of a team in this project.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_team_membership_limit ON public.team_members;
CREATE TRIGGER trigger_check_team_membership_limit
  BEFORE INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_team_membership_limit();

-- 6. Create trigger to enforce department matching when joining a team
CREATE OR REPLACE FUNCTION public.check_team_member_department()
RETURNS TRIGGER AS $$
DECLARE
  v_team_dept UUID;
  v_user_dept UUID;
BEGIN
  SELECT department_id INTO v_team_dept FROM public.teams WHERE id = NEW.team_id;
  SELECT department_id INTO v_user_dept FROM public.profiles WHERE id = NEW.user_id;

  IF v_team_dept IS NOT NULL AND (v_user_dept IS NULL OR v_user_dept <> v_team_dept) THEN
    RAISE EXCEPTION 'You can only join teams within your own department.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_team_member_department ON public.team_members;
CREATE TRIGGER trigger_check_team_member_department
  BEFORE INSERT ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_team_member_department();

-- 7. Create trigger to enforce department matching when requesting to join
CREATE OR REPLACE FUNCTION public.check_join_request_department()
RETURNS TRIGGER AS $$
DECLARE
  v_team_dept UUID;
  v_user_dept UUID;
BEGIN
  SELECT department_id INTO v_team_dept FROM public.teams WHERE id = NEW.team_id;
  SELECT department_id INTO v_user_dept FROM public.profiles WHERE id = NEW.user_id;

  IF v_team_dept IS NOT NULL AND (v_user_dept IS NULL OR v_user_dept <> v_team_dept) THEN
    RAISE EXCEPTION 'You can only request to join teams within your own department.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_join_request_department ON public.join_requests;
CREATE TRIGGER trigger_check_join_request_department
  BEFORE INSERT ON public.join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_join_request_department();
