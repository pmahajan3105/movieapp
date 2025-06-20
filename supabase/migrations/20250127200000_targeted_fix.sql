-- Targeted fix for actors column issue only
-- Migration: 20250127200000_targeted_fix.sql

BEGIN;

-- Remove actors column from movies table if it exists (this is the main issue)
DO $$
BEGIN
    IF EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='movies' AND column_name='actors'
    ) THEN
        ALTER TABLE movies DROP COLUMN actors;
        RAISE NOTICE 'Dropped actors column from movies table';
    ELSE
        RAISE NOTICE 'Actors column does not exist, skipping';
    END IF;
END $$;

-- Create test user safely (only if not exists)
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

-- Create corresponding user profile safely
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
    full_name = EXCLUDED.full_name,
    onboarding_completed = EXCLUDED.onboarding_completed;

COMMIT; 