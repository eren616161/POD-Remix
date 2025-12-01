-- Migration: Anonymous Usage Tracking for Free Tier Rate Limiting
-- Run this migration in your Supabase SQL editor

-- ============================================================================
-- TABLE: anonymous_usage
-- Purpose: Track daily generation counts per IP hash for rate limiting
-- ============================================================================

create table if not exists anonymous_usage (
  id uuid default gen_random_uuid() primary key,
  ip_hash text not null,
  date date not null default current_date,
  count int default 1,
  created_at timestamptz default now(),
  unique(ip_hash, date)
);

-- Create index for fast lookups by IP hash and date
create index if not exists anonymous_usage_lookup on anonymous_usage(ip_hash, date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS (but allow all operations since this is anonymous tracking)
alter table anonymous_usage enable row level security;

-- Policy: Allow insert and update for all (anonymous tracking)
-- Note: This is intentionally permissive as we're tracking by hashed IP
create policy "Allow anonymous usage tracking" on anonymous_usage
  for all
  using (true)
  with check (true);

-- ============================================================================
-- CLEANUP FUNCTION (Optional)
-- Run this as a daily cron job to prevent table bloat
-- ============================================================================

-- Function to clean up old records
create or replace function cleanup_anonymous_usage()
returns void as $$
begin
  delete from anonymous_usage where date < current_date - interval '7 days';
end;
$$ language plpgsql;

-- To set up automatic cleanup with pg_cron (if available):
-- select cron.schedule('cleanup-anonymous-usage', '0 3 * * *', 'select cleanup_anonymous_usage()');

-- ============================================================================
-- MANUAL CLEANUP (Run if needed)
-- ============================================================================
-- delete from anonymous_usage where date < current_date - interval '7 days';

