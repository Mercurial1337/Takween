-- ============================================================================
-- Takween Database Schema
-- Version: 004 — Auto Profile Trigger
-- Description: Trigger to automatically create profiles and populate skills
--              from auth.users metadata during registration.
-- ============================================================================

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_skill_name TEXT;
  v_skill_id UUID;
  v_skills_array JSONB;
  i INT;
BEGIN
  -- Insert user profile inside a protective exception block to prevent signup 500 errors
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, whatsapp_number, level_id, linkedin_url, github_url, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', ''),
      NULLIF(NEW.raw_user_meta_data->>'level_id', '')::uuid,
      NEW.raw_user_meta_data->>'linkedin_url',
      NEW.raw_user_meta_data->>'github_url',
      'student'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      whatsapp_number = EXCLUDED.whatsapp_number,
      level_id = EXCLUDED.level_id,
      linkedin_url = EXCLUDED.linkedin_url,
      github_url = EXCLUDED.github_url;

    -- Handle skills if provided in metadata
    v_skills_array := NEW.raw_user_meta_data->'skills';
    IF v_skills_array IS NOT NULL AND jsonb_typeof(v_skills_array) = 'array' AND jsonb_array_length(v_skills_array) > 0 THEN
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
  EXCEPTION WHEN OTHERS THEN
    -- Log warning and ignore to ensure Supabase Auth transaction succeeds.
    -- (The frontend client-side upsert handles fallback creation of profiles & skills anyway)
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
