-- Remove WordPress auto-update settings from settings table
ALTER TABLE public.settings 
DROP COLUMN IF EXISTS auto_wordpress_updates_enabled,
DROP COLUMN IF EXISTS wordpress_update_schedule;