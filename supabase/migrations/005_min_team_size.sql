-- ============================================================================
-- Takween Database Schema
-- Version: 005 — Min Team Size
-- Description: Add min_team_size column to projects table with constraints.
-- ============================================================================

-- Add column with default value 1
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS min_team_size INT NOT NULL DEFAULT 1;

-- Add check constraint ensuring min_team_size is >= 1 and <= 20
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS check_min_team_size_range,
ADD CONSTRAINT check_min_team_size_range CHECK (min_team_size >= 1 AND min_team_size <= 20);

-- Add check constraint ensuring min_team_size <= max_team_size
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS check_min_max_team_size,
ADD CONSTRAINT check_min_max_team_size CHECK (min_team_size <= max_team_size);
