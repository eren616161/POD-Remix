-- =====================================================
-- POD Remix - PERFORMANCE FIX MIGRATION
-- =====================================================
-- This migration fixes slow RLS policy queries by:
-- 1. Adding user_id directly to variants table
-- 2. Creating optimized indexes
-- 3. Replacing subquery-based RLS policies with direct checks
-- 
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- STEP 1: Add user_id column to variants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'variants' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE variants ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added user_id column to variants table';
  ELSE
    RAISE NOTICE 'user_id column already exists in variants table';
  END IF;
END $$;

-- STEP 2: Backfill user_id from projects table
UPDATE variants v
SET user_id = p.user_id
FROM projects p
WHERE v.project_id = p.id
  AND v.user_id IS NULL;

-- STEP 3: Make user_id NOT NULL (after backfill)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM variants WHERE user_id IS NULL) THEN
    RAISE NOTICE 'Warning: Some variants still have NULL user_id. Skipping NOT NULL constraint.';
  ELSE
    ALTER TABLE variants ALTER COLUMN user_id SET NOT NULL;
    RAISE NOTICE 'Set user_id to NOT NULL';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not set NOT NULL constraint: %', SQLERRM;
END $$;

-- STEP 4: Create optimized indexes
CREATE INDEX IF NOT EXISTS variants_user_id_idx ON variants(user_id);
CREATE INDEX IF NOT EXISTS projects_id_user_id_idx ON projects(id, user_id);
CREATE INDEX IF NOT EXISTS variants_project_user_idx ON variants(project_id, user_id);
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS variants_project_id_idx ON variants(project_id);

-- STEP 5: Drop existing RLS policies on variants
DROP POLICY IF EXISTS "Users can view own variants" ON variants;
DROP POLICY IF EXISTS "Users can insert variants to own projects" ON variants;
DROP POLICY IF EXISTS "Users can delete own variants" ON variants;
DROP POLICY IF EXISTS "Users can update own variants" ON variants;

-- STEP 6: Create NEW optimized RLS policies for variants
CREATE POLICY "Users can view own variants"
  ON variants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own variants"
  ON variants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variants"
  ON variants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own variants"
  ON variants FOR DELETE
  USING (auth.uid() = user_id);

-- STEP 7: Ensure projects RLS policies are optimal
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- STEP 8: Create trigger to auto-populate user_id
CREATE OR REPLACE FUNCTION set_variant_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id
    FROM projects
    WHERE id = NEW.project_id;
  END IF;
  
  IF NEW.user_id != (SELECT user_id FROM projects WHERE id = NEW.project_id) THEN
    RAISE EXCEPTION 'Variant user_id must match project owner';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_variant_user_id ON variants;

CREATE TRIGGER trigger_set_variant_user_id
  BEFORE INSERT ON variants
  FOR EACH ROW
  EXECUTE FUNCTION set_variant_user_id();

-- STEP 9: Analyze tables for query planner
ANALYZE projects;
ANALYZE variants;

-- STEP 10: Verify the migration
DO $$
DECLARE
  variant_count INTEGER;
  null_user_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO variant_count FROM variants;
  SELECT COUNT(*) INTO null_user_count FROM variants WHERE user_id IS NULL;
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'variants';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Total variants: %', variant_count;
  RAISE NOTICE '  Variants with NULL user_id: %', null_user_count;
  RAISE NOTICE '  RLS policies on variants: %', policy_count;
  RAISE NOTICE '========================================';
  
  IF null_user_count > 0 THEN
    RAISE WARNING 'Some variants still have NULL user_id!';
  ELSE
    RAISE NOTICE 'SUCCESS: All variants have user_id populated';
  END IF;
END $$;

-- =====================================================
-- DONE! Performance should now be significantly improved.
-- =====================================================
-- 
-- Expected improvements:
-- - Queries on variants table: 10-100x faster
-- - Queries joining projects + variants: 5-50x faster
-- - RLS checks are now O(1) instead of O(n)
-- =====================================================
