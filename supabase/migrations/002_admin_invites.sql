-- ============================================================================
-- Takween Database Schema
-- Version: 002 — Admin Invites
-- Description: Table for inviting admins and automatic role elevation trigger
-- ============================================================================

-- Create admin invites table
CREATE TABLE IF NOT EXISTS admin_invites (
  email TEXT PRIMARY KEY,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

-- ---- POLICIES ----
CREATE POLICY "Admins can view invites"
  ON admin_invites FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert invites"
  ON admin_invites FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete invites"
  ON admin_invites FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---- TRIGGER FUNCTION ----
-- Automatically elevates user's role to 'admin' if email is in admin_invites
CREATE OR REPLACE FUNCTION promote_invited_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM admin_invites WHERE LOWER(email) = LOWER(NEW.email)) THEN
    NEW.role := 'admin';
    -- Delete the invite now that user is registered
    DELETE FROM admin_invites WHERE LOWER(email) = LOWER(NEW.email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger before profile insertion
CREATE OR REPLACE TRIGGER trigger_promote_invited_admin
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION promote_invited_admin();
