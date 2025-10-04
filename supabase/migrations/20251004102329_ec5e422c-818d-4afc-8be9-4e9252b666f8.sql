-- Schedule weekly WordPress updates (every Sunday at 2 AM UTC)
SELECT cron.schedule(
  'wordpress-weekly-updates',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    url:='https://rzpdqckfielpifozfeja.supabase.co/functions/v1/run-wordpress-updates',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cGRxY2tmaWVscGlmb3pmZWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk2ODEsImV4cCI6MjA3NTAxNTY4MX0.vLRPh1sH_1zcrJnMAREZhjU2GlxT-60_To6yCW1JLJk"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);