-- ============================================================================
-- Takween Database Schema
-- Version: 021 — Public Whatsapp, Hidden Email
-- Description: Moves whatsapp_number back to profiles so it's public for all
--              authenticated users, while keeping email strictly isolated in
--              contact_info. Also removes admin_users_view.
-- ============================================================================

-- 1. Add whatsapp_number back to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- 2. Migrate data back from contact_info
UPDATE public.profiles p
SET whatsapp_number = c.whatsapp_number
FROM public.contact_info c
WHERE p.id = c.id;

-- 3. Drop admin_users_view (admins will query profiles directly without emails)
DROP VIEW IF EXISTS public.admin_users_view;

-- 4. Drop whatsapp_number from contact_info
ALTER TABLE public.contact_info DROP COLUMN IF EXISTS whatsapp_number;

-- 5. Update the auth.users trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_skill_name TEXT;
  v_skill_id UUID;
  v_skills_array JSONB;
  i INT;
BEGIN
  BEGIN
    -- Insert into profiles (with whatsapp_number)
    INSERT INTO public.profiles (id, full_name, whatsapp_number, level_id, linkedin_url, github_url, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
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
