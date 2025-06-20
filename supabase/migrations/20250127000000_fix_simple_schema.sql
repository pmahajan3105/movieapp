-- Fix simple database schema issues
-- Migration: 20250127000000_fix_simple_schema.sql

BEGIN;

-- 1. Remove actors column from movies table (since you don't want it)
DO $$
BEGIN
    IF EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='movies' AND column_name='actors'
    ) THEN
        ALTER TABLE movies DROP COLUMN actors;
    END IF;
END $$;

-- 2. Remove other unwanted columns
ALTER TABLE movies 
    DROP COLUMN IF EXISTS actors,
DROP COLUMN IF EXISTS backdrop_url;

-- 3. Create a simple test user for development
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test@example.com',
    crypt('testpassword', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test User"}'
) ON CONFLICT (id) DO NOTHING;

-- 4. Create corresponding user profile
INSERT INTO user_profiles (
    id,
    email,
    full_name,
    onboarding_completed
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'test@example.com',
    'Test User',
    true
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

-- 5. Add some sample ratings for testing
INSERT INTO ratings (user_id, movie_id, interested, rating) 
SELECT 
    '550e8400-e29b-41d4-a716-446655440000',
    m.id,
    true,
    4
FROM movies m 
LIMIT 3
ON CONFLICT (user_id, movie_id) DO NOTHING;

COMMIT; 