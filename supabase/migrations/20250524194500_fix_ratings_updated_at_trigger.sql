-- Fix ratings table trigger that references non-existent updated_at column
-- Migration: 20250524194500_fix_ratings_updated_at_trigger.sql

BEGIN;

-- Remove the problematic trigger on ratings table
DROP TRIGGER IF EXISTS update_ratings_updated_at ON ratings;

-- The ratings table doesn't have an updated_at column, so we don't need this trigger
-- If we need to track updates in the future, we can add the column and recreate the trigger

COMMIT; 