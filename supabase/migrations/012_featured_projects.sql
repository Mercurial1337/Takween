-- ============================================================================
-- Takween Database Schema
-- Version: 012 — Featured Projects
-- Description: Adds is_featured flag to projects and inserts Graduation Project
-- ============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Insert the Graduation Project if it doesn't already exist
INSERT INTO projects (title, description, is_featured, max_team_size)
SELECT 'Graduation Project', 'The final capstone project for all graduating students. Form your team, find members with the right skills, and build something amazing.', true, 6
WHERE NOT EXISTS (
  SELECT 1 FROM projects WHERE title ILIKE 'Graduation Project%'
);
