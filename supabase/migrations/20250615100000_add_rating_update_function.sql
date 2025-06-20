-- Add function to update watchlist rating
-- Migration: 20250615100000_add_rating_update_function.sql

BEGIN;

-- Create function to update watchlist rating directly
CREATE OR REPLACE FUNCTION update_watchlist_rating(
  watchlist_id UUID,
  user_id UUID,
  new_rating INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate rating is between 1 and 5
  IF new_rating < 1 OR new_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Update the rating
  UPDATE watchlist 
  SET rating = new_rating
  WHERE id = watchlist_id 
    AND user_id = update_watchlist_rating.user_id;

  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_watchlist_rating(UUID, UUID, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_watchlist_rating IS 'Updates rating for a watchlist item, bypassing schema cache issues';

COMMIT; 