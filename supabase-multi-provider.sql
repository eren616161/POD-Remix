-- Multi-provider, multi-store support
-- Run this in Supabase SQL

-- Provider credentials (one per user per provider)
create table if not exists user_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  auth_type text not null, -- e.g., api_token, oauth
  credentials jsonb not null,
  connected_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

-- Stores/shops under a provider (supports multiple per user/provider)
create table if not exists user_provider_shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  shop_id text not null,
  shop_name text,
  sales_channel text,
  is_default boolean default false,
  metadata jsonb,
  connected_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider, shop_id)
);

-- Indexes
create index if not exists idx_user_providers_user_provider on user_providers(user_id, provider);
create index if not exists idx_user_provider_shops_user_provider on user_provider_shops(user_id, provider);

-- RLS
alter table user_providers enable row level security;
alter table user_provider_shops enable row level security;

create policy "Users can view their providers"
  on user_providers for select
  using (auth.uid() = user_id);

create policy "Users can manage their providers"
  on user_providers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can view their provider shops"
  on user_provider_shops for select
  using (auth.uid() = user_id);

create policy "Users can manage their provider shops"
  on user_provider_shops for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

