-- ============================================================================
-- Takween Database Schema
-- Version: 018 — Drop Obsolete Profile Update Trigger
-- Description: Permanently removes the log_profile_update trigger which 
--              references the deprecated looking_for_team column.
-- ============================================================================

DROP TRIGGER IF EXISTS log_profile_update_trigger ON public.profiles;
DROP FUNCTION IF EXISTS log_profile_update();
