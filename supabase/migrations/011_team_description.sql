-- ============================================================================
-- Takween Database Schema
-- Version: 011 — Add Team Description
-- Description: Adds a description field to the teams table so leaders can specify requirements.
-- ============================================================================

ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;
