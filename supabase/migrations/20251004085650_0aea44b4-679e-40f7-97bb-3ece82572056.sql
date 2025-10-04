-- Add 'done' status to subscription_status enum
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'done';

-- Set up pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the check-reminders function to run every minute
SELECT cron.schedule(
  'check-subscription-reminders',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://rzpdqckfielpifozfeja.supabase.co/functions/v1/check-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cGRxY2tmaWVscGlmb3pmZWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk2ODEsImV4cCI6MjA3NTAxNTY4MX0.vLRPh1sH_1zcrJnMAREZhjU2GlxT-60_To6yCW1JLJk"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);