-- Fix existing database schema issues safely
-- Migration: 20250127100000_fix_existing_schema.sql

BEGIN;

-- 1. Remove actors column from movies table if it exists (this is causing the error)
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

-- 2. Remove other unwanted columns that might exist
DO $$
BEGIN
    IF EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='movies' AND column_name='backdrop_url'
    ) THEN
        ALTER TABLE movies DROP COLUMN backdrop_url;
    END IF;
END $$;

-- 3. Ensure movies table has the right structure
-- Check and update columns as needed
DO $$
BEGIN
    -- Ensure genre column is TEXT[] if not already
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='movies' AND column_name='genre' AND data_type='ARRAY'
    ) THEN
        -- If genre exists as TEXT, convert to TEXT[]
        IF EXISTS (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='movies' AND column_name='genre'
        ) THEN
            ALTER TABLE movies ALTER COLUMN genre TYPE TEXT[] USING string_to_array(genre, ',');
        ELSE
            ALTER TABLE movies ADD COLUMN genre TEXT[] DEFAULT '{}';
        END IF;
    END IF;

    -- Ensure director column is TEXT[] if not already
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='movies' AND column_name='director' AND data_type='ARRAY'
    ) THEN
        IF EXISTS (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='movies' AND column_name='director'
        ) THEN
            ALTER TABLE movies ALTER COLUMN director TYPE TEXT[] USING string_to_array(director, ',');
        ELSE
            ALTER TABLE movies ADD COLUMN director TEXT[] DEFAULT '{}';
        END IF;
    END IF;
END $$;

-- 4. Create test user safely (only if not exists)
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

-- 5. Create corresponding user profile safely
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

-- 6. Add some sample ratings for testing (only if movies exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM movies LIMIT 1) THEN
        INSERT INTO ratings (user_id, movie_id, interested, rating) 
        SELECT 
            '550e8400-e29b-41d4-a716-446655440000',
            m.id,
            true,
            4
        FROM movies m 
        LIMIT 3
        ON CONFLICT (user_id, movie_id) DO NOTHING;
    END IF;
END $$;

-- 7. Clean up any problematic views or functions that reference removed columns
DROP VIEW IF EXISTS user_movie_categories;

COMMIT; 