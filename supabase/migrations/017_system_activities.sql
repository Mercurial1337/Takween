-- Create system_activities table
CREATE TABLE IF NOT EXISTS public.system_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'register', 'login', 'logout', 'mark_available', 'create_team', 'invite'
    entity_type TEXT NOT NULL, -- 'profile', 'team', 'auth', 'notification'
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_activities ENABLE ROW LEVEL SECURITY;

-- Only admins can view activities
DROP POLICY IF EXISTS "Admins can view system activities" ON public.system_activities;
CREATE POLICY "Admins can view system activities" 
    ON public.system_activities FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- Triggers to auto-log some activities
-- 1. Profile creation (Registration)
CREATE OR REPLACE FUNCTION log_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.system_activities (user_id, action_type, entity_type, entity_id, metadata)
    VALUES (NEW.id, 'register', 'profile', NEW.id, jsonb_build_object('name', NEW.full_name));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_profile_creation_trigger ON public.profiles;
CREATE TRIGGER log_profile_creation_trigger
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION log_profile_creation();

-- 2. Team creation
CREATE OR REPLACE FUNCTION log_team_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.system_activities (user_id, action_type, entity_type, entity_id, metadata)
    VALUES (NEW.owner_id, 'create_team', 'team', NEW.id, jsonb_build_object('project_id', NEW.project_id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_team_creation_trigger ON public.teams;
CREATE TRIGGER log_team_creation_trigger
    AFTER INSERT ON public.teams
    FOR EACH ROW EXECUTE FUNCTION log_team_creation();

-- 3. Profile update (mark available)
CREATE OR REPLACE FUNCTION log_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.looking_for_team IS DISTINCT FROM NEW.looking_for_team AND NEW.looking_for_team = true THEN
        INSERT INTO public.system_activities (user_id, action_type, entity_type, entity_id)
        VALUES (NEW.id, 'mark_available', 'profile', NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS log_profile_update_trigger ON public.profiles;
CREATE TRIGGER log_profile_update_trigger
    AFTER UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION log_profile_update();
