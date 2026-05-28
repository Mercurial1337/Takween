-- ============================================================================
-- Takween Database Schema
-- Version: 019 — Secure Contact Info
-- Description: Moves sensitive email and whatsapp_number data into a separate
--              table with strict RLS policies to prevent data leaks.
-- ============================================================================

-- 1. Create contact_info table
CREATE TABLE IF NOT EXISTS public.contact_info (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies for contact_info

-- Users can view their own contact info
CREATE POLICY "Users can view own contact info"
  ON public.contact_info FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all contact info
CREATE POLICY "Admins can view all contact info"
  ON public.contact_info FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Teammates can view each other's contact info
CREATE POLICY "Teammates can view each other's contact info"
  ON public.contact_info FOR SELECT
  USING (
    public.are_teammates(auth.uid(), id)
  );

-- Users can insert their own contact info
CREATE POLICY "Users can insert own contact info"
  ON public.contact_info FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own contact info
CREATE POLICY "Users can update own contact info"
  ON public.contact_info FOR UPDATE
  USING (auth.uid() = id);

-- 4. Migrate Data
-- Copy existing emails and whatsapp numbers from profiles
INSERT INTO public.contact_info (id, email, whatsapp_number)
SELECT id, email, whatsapp_number
FROM public.profiles
ON CONFLICT (id) DO NOTHING;

-- 5. Drop columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS whatsapp_number;

-- 6. Update the auth.users trigger to populate both tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_skill_name TEXT;
  v_skill_id UUID;
  v_skills_array JSONB;
  i INT;
BEGIN
  BEGIN
    -- Insert into profiles (no email or whatsapp_number)
    INSERT INTO public.profiles (id, full_name, level_id, linkedin_url, github_url, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'level_id', '')::uuid,
      NEW.raw_user_meta_data->>'linkedin_url',
      NEW.raw_user_meta_data->>'github_url',
      'student'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      level_id = EXCLUDED.level_id,
      linkedin_url = EXCLUDED.linkedin_url,
      github_url = EXCLUDED.github_url;

    -- Insert into contact_info
    INSERT INTO public.contact_info (id, email, whatsapp_number)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', '')
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      whatsapp_number = EXCLUDED.whatsapp_number;

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

-- 7. Add updated_at trigger for contact_info
CREATE TRIGGER set_contact_info_updated_at
  BEFORE UPDATE ON public.contact_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Create admin users view for easier searching/listing in the admin panel
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  p.id, 
  p.full_name, 
  p.role, 
  p.avatar_url, 
  p.created_at, 
  c.email, 
  c.whatsapp_number
FROM public.profiles p
LEFT JOIN public.contact_info c ON p.id = c.id;

