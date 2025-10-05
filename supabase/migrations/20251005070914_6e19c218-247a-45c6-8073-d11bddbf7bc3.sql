-- Add trigger API URL to settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS trigger_api_url text DEFAULT 'https://kareemsamman.com/trigger_updates/';