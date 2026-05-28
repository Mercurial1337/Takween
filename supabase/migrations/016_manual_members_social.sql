-- Migration: Add linkedin_url and github_url to manual_members table

ALTER TABLE manual_members
ADD COLUMN linkedin_url TEXT,
ADD COLUMN github_url TEXT;
