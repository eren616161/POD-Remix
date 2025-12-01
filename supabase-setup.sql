-- =====================================================
-- POD Remix Design Library - Supabase Database Setup
-- =====================================================
-- Run this SQL in your Supabase SQL Editor

-- 1. Create Projects Table
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  original_image_url text not null,
  created_at timestamptz default now()
);

-- 2. Create Variants Table
create table if not exists variants (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  variant_number int not null check (variant_number between 1 and 4),
  strategy text not null,
  image_url text not null,
  recommended_background text not null check (recommended_background in ('light', 'dark')),
  product_hint text,
  created_at timestamptz default now()
);

-- 3. Enable Row Level Security
alter table projects enable row level security;
alter table variants enable row level security;

-- 4. Projects RLS Policies
-- Users can only see their own projects
create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = user_id);

-- Users can insert their own projects
create policy "Users can insert own projects"
  on projects for insert
  with check (auth.uid() = user_id);

-- Users can delete their own projects
create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- Users can update their own projects
create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

-- 5. Variants RLS Policies
-- Users can view variants of their projects
create policy "Users can view own variants"
  on variants for select
  using (
    exists (
      select 1 from projects
      where projects.id = variants.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Users can insert variants to their projects
create policy "Users can insert variants to own projects"
  on variants for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = project_id
      and projects.user_id = auth.uid()
    )
  );

-- Users can delete variants from their projects
create policy "Users can delete own variants"
  on variants for delete
  using (
    exists (
      select 1 from projects
      where projects.id = variants.project_id
      and projects.user_id = auth.uid()
    )
  );

-- 6. Create indexes for performance
create index if not exists projects_user_id_idx on projects(user_id);
create index if not exists projects_created_at_idx on projects(created_at desc);
create index if not exists variants_project_id_idx on variants(project_id);

-- =====================================================
-- Storage Bucket Setup
-- =====================================================
-- IMPORTANT: Run this section to create the storage bucket
-- The bucket MUST exist for image uploads to work!

-- 7. Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-images',
  'design-images',
  true,  -- Make it public for image URLs to work
  52428800,  -- 50MB file size limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 8. Storage RLS Policies
-- Allow authenticated users to upload to their folder
CREATE POLICY "Users can upload to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-images' AND
  (storage.foldername(name))[1] IN ('originals', 'variants') AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'design-images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow public to read all design images (needed for public URLs)
CREATE POLICY "Public can read all design images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'design-images');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'design-images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to update their own files
CREATE POLICY "Users can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'design-images' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- =====================================================
-- MANUAL SETUP (if SQL above fails for storage)
-- =====================================================
-- If the storage bucket creation above fails (due to permissions),
-- create it manually in Supabase Dashboard:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Click "New Bucket"
-- 3. Name: design-images
-- 4. Check "Public bucket"
-- 5. Click "Create bucket"
-- 6. Then run only the policy statements above in SQL Editor

