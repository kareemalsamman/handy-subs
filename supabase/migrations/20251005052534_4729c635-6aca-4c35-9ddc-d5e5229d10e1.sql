-- Add auto messages enabled flag to settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS auto_messages_enabled boolean DEFAULT true;