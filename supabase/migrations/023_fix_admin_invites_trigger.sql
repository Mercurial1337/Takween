-- ============================================================================
-- Takween Database Schema
-- Version: 023 — Fix Admin Invites Trigger
-- Description: Drops the broken promote_invited_admin trigger that references 
--              the dropped 'email' column on profiles, and integrates the logic
--              directly into handle_new_user. Respects migration 021 schema.
-- ============================================================================

-- 1. Drop the broken trigger that is blocking profile insertions
DROP TRIGGER IF EXISTS trigger_promote_invited_admin ON public.profiles;

-- 2. Drop the obsolete function
DROP FUNCTION IF EXISTS public.promote_invited_admin();

-- 3. Update handle_new_user to handle admin invites directly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_skill_name TEXT;
  v_skill_id UUID;
  v_skills_array JSONB;
  i INT;
  v_role TEXT;
BEGIN
  BEGIN
    -- Check if user was invited as admin
    v_role := 'student';
    IF EXISTS (SELECT 1 FROM public.admin_invites WHERE LOWER(email) = LOWER(NEW.email)) THEN
      v_role := 'admin';
      DELETE FROM public.admin_invites WHERE LOWER(email) = LOWER(NEW.email);
    END IF;

    -- Insert into profiles (with whatsapp_number, no email)
    INSERT INTO public.profiles (id, full_name, whatsapp_number, level_id, linkedin_url, github_url, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', ''),
      NULLIF(NEW.raw_user_meta_data->>'level_id', '')::uuid,
      NEW.raw_user_meta_data->>'linkedin_url',
      NEW.raw_user_meta_data->>'github_url',
      v_role
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      whatsapp_number = EXCLUDED.whatsapp_number,
      level_id = EXCLUDED.level_id,
      linkedin_url = EXCLUDED.linkedin_url,
      github_url = EXCLUDED.github_url;

    -- Insert into contact_info (email only)
    INSERT INTO public.contact_info (id, email)
    VALUES (
      NEW.id,
      NEW.email
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email;

    -- Handle skills if provided in metadata
    v_skills_array := NEW.raw_user_meta_data->'skills';
    IF v_skills_array IS NOT NULL AND jsonb_typeof(v_skills_array) = 'array' AND jsonb_array_length(v_skills_array) > 0 THEN
      FOR i IN 0 .. jsonb_array_length(v_skills_array) - 1 LOOP
        v_skill_name := jsonb_extract_path_text(v_skills_array, i::text);
        
        IF v_skill_name IS NOT NULL AND v_skill_name <> '' THEN
          INSERT INTO public.skills (name, is_predefined)
          VALUES (v_skill_name, false)
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id INTO v_skill_id;

          INSERT INTO public.profile_skills (profile_id, skill_id)
          VALUES (NEW.id, v_skill_id)
          ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
