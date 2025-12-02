-- =====================================================
-- Add thumbnail_url column to variants table
-- =====================================================
-- Run this SQL in your Supabase SQL Editor

-- Add the thumbnail_url column (nullable for backwards compatibility)
ALTER TABLE variants 
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Optional: Create an index for faster queries
CREATE INDEX IF NOT EXISTS variants_thumbnail_url_idx ON variants(thumbnail_url);

-- Note: Existing variants will have NULL thumbnail_url
-- New variants will have thumbnails generated automatically
-- The app will fallback to image_url if thumbnail_url is NULL

