-- Add WordPress management fields to domains table
ALTER TABLE public.domains
ADD COLUMN IF NOT EXISTS wordpress_secret_key text,
ADD COLUMN IF NOT EXISTS last_checked timestamp with time zone,
ADD COLUMN IF NOT EXISTS wordpress_update_available boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plugins_updates_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS themes_updates_count integer DEFAULT 0;

-- Add settings for automatic WordPress updates
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS auto_wordpress_updates_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS wordpress_update_schedule text DEFAULT '0 2 * * 0';

-- Create table for WordPress update logs
CREATE TABLE IF NOT EXISTS public.wordpress_update_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  status text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on wordpress_update_logs
ALTER TABLE public.wordpress_update_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for wordpress_update_logs
CREATE POLICY "Admin full access to wordpress_update_logs"
ON public.wordpress_update_logs
FOR ALL
USING (auth.uid() IS NOT NULL);