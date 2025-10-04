-- Unschedule previous every-minute job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('invoke-function-every-minute');
EXCEPTION WHEN others THEN
  -- ignore if job doesn't exist
  NULL;
END $$;

-- Schedule daily reminder check at 09:00 UTC
select
cron.schedule(
  'invoke-check-reminders-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url:='https://rzpdqckfielpifozfeja.supabase.co/functions/v1/check-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cGRxY2tmaWVscGlmb3pmZWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk2ODEsImV4cCI6MjA3NTAxNTY4MX0.vLRPh1sH_1zcrJnMAREZhjU2GlxT-60_To6yCW1JLJk"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);