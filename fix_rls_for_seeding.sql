-- Temporary fix for movie seeding
-- Run this in your Supabase SQL Editor

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Only admins can insert movies" ON movies;

-- Create a temporary policy that allows insertions
-- (We'll tighten this up later for production)
CREATE POLICY "Allow movie seeding" ON movies
  FOR INSERT WITH CHECK (true);

-- Optional: You can also create a time-limited policy
-- CREATE POLICY "Temporary seeding policy" ON movies
--   FOR INSERT WITH CHECK (
--     EXTRACT(EPOCH FROM NOW()) < EXTRACT(EPOCH FROM '2025-05-25 00:00:00'::timestamp)
--   );

-- Verify the policy was created
SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'movies' AND cmd = 'INSERT'; 