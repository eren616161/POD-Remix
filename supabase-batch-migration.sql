-- =====================================================
-- POD Remix - Batch Number Migration
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to add support
-- for multiple variant batches (regeneration feature)

-- 1. Add batch_number column to variants table
-- Default is 1 for all existing variants (original generation)
ALTER TABLE variants ADD COLUMN IF NOT EXISTS batch_number int NOT NULL DEFAULT 1;

-- 2. Remove the old variant_number constraint (1-4 only)
-- We need to allow variant numbers 1-4 per batch
ALTER TABLE variants DROP CONSTRAINT IF EXISTS variants_variant_number_check;

-- 3. Add new constraint: variant_number must be 1-4 (within each batch)
ALTER TABLE variants ADD CONSTRAINT variants_variant_number_check 
  CHECK (variant_number BETWEEN 1 AND 4);

-- 4. Add unique constraint: combination of project_id, batch_number, variant_number must be unique
-- This prevents duplicate variants within the same batch
ALTER TABLE variants ADD CONSTRAINT variants_project_batch_variant_unique 
  UNIQUE (project_id, batch_number, variant_number);

-- 5. Create index for efficient batch queries
CREATE INDEX IF NOT EXISTS variants_batch_number_idx ON variants(project_id, batch_number);

-- 6. Verify the migration
-- You can run this to check the new column exists:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'variants' AND column_name = 'batch_number';


