-- =====================================================
-- POD Remix - FIX RLS POLICIES
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to fix
-- "row-level security policy" errors
-- =====================================================

-- =====================================================
-- STEP 1: Drop existing storage policies (if any)
-- =====================================================
DROP POLICY IF EXISTS "Users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read all design images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their files" ON storage.objects;

-- =====================================================
-- STEP 2: Create new storage policies
-- =====================================================

-- Allow authenticated users to upload files to design-images bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'design-images');

-- Allow authenticated users to update their files
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'design-images');

-- Allow anyone to read files (public bucket)
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'design-images');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'design-images');

-- =====================================================
-- STEP 3: Verify/Create database tables
-- =====================================================

-- Create Projects Table (if not exists)
CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  original_image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create Variants Table (if not exists)
CREATE TABLE IF NOT EXISTS variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  variant_number int NOT NULL CHECK (variant_number BETWEEN 1 AND 4),
  strategy text NOT NULL,
  image_url text NOT NULL,
  recommended_background text NOT NULL CHECK (recommended_background IN ('light', 'dark')),
  product_hint text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- STEP 4: Enable RLS on tables
-- =====================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: Drop existing table policies (if any)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can view own variants" ON variants;
DROP POLICY IF EXISTS "Users can insert variants to own projects" ON variants;
DROP POLICY IF EXISTS "Users can delete own variants" ON variants;

-- =====================================================
-- STEP 6: Create table RLS policies
-- =====================================================

-- Projects policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Variants policies
CREATE POLICY "Users can view own variants"
  ON variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = variants.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert variants to own projects"
  ON variants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own variants"
  ON variants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = variants.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 7: Create indexes (if not exist)
-- =====================================================
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS variants_project_id_idx ON variants(project_id);

-- =====================================================
-- DONE! Your RLS policies should now work correctly.
-- =====================================================

