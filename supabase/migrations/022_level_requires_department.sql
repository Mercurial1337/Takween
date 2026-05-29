-- ============================================================================
-- Takween Database Schema
-- Version: 022 — Level Requires Department
-- Description: Adds a requires_department boolean to the levels table to replace
--              hardcoded sort_order logic.
-- ============================================================================

-- 1. Add the column
ALTER TABLE public.levels ADD COLUMN IF NOT EXISTS requires_department BOOLEAN NOT NULL DEFAULT false;

-- 2. Update existing levels (Assuming levels 3 and 4 should have it based on typical names or sort_order)
UPDATE public.levels 
SET requires_department = true 
WHERE sort_order >= 3 OR name ILIKE '%Year 3%' OR name ILIKE '%Year 4%' OR name ILIKE '%Level 3%' OR name ILIKE '%Level 4%';
