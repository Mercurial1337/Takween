-- Drop the restrictive policy
DROP POLICY IF EXISTS "Manual members viewable by team members" ON manual_members;

-- Create a new policy that makes manual members viewable by everyone
CREATE POLICY "Manual members are viewable by everyone"
  ON manual_members FOR SELECT USING (true);
