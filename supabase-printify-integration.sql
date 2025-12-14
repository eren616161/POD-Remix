-- Printify Integration Tables
-- Run this migration in Supabase SQL editor

-- User's Printify connection
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  api_token TEXT NOT NULL,
  shop_id TEXT,
  shop_name TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Track published products
CREATE TABLE IF NOT EXISTS published_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  printify_product_id TEXT NOT NULL,
  printify_shop_id TEXT NOT NULL,
  blueprint_id INT,
  print_provider_id INT,
  product_type TEXT,
  title TEXT NOT NULL,
  retail_price DECIMAL(10,2),
  shopify_product_id TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_integrations
CREATE POLICY "Users can view their own integrations"
  ON user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations"
  ON user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations"
  ON user_integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations"
  ON user_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for published_products
CREATE POLICY "Users can view their own published products"
  ON published_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own published products"
  ON published_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own published products"
  ON published_products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own published products"
  ON published_products FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider ON user_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_published_products_user_id ON published_products(user_id);
CREATE INDEX IF NOT EXISTS idx_published_products_variant_id ON published_products(variant_id);
CREATE INDEX IF NOT EXISTS idx_published_products_printify_product_id ON published_products(printify_product_id);

