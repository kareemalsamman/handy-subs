-- Add domain_id to subscriptions and restructure
ALTER TABLE public.subscriptions 
ADD COLUMN domain_id uuid REFERENCES public.domains(id) ON DELETE CASCADE;

-- Update existing subscriptions to link to first domain of each user
UPDATE public.subscriptions s
SET domain_id = (
  SELECT id FROM public.domains d 
  WHERE d.user_id = s.user_id 
  LIMIT 1
);

-- Make domain_id required
ALTER TABLE public.subscriptions 
ALTER COLUMN domain_id SET NOT NULL;

-- Drop profit column first, then m_cost
ALTER TABLE public.subscriptions 
DROP COLUMN IF EXISTS profit CASCADE;

ALTER TABLE public.subscriptions 
DROP COLUMN IF EXISTS m_cost CASCADE;

-- Create function to get monthly cost per user
CREATE OR REPLACE FUNCTION public.get_monthly_cost_per_user()
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  server_cost numeric;
  total_users integer;
BEGIN
  SELECT server_monthly_cost INTO server_cost FROM public.settings LIMIT 1;
  SELECT COUNT(DISTINCT user_id) INTO total_users FROM public.subscriptions WHERE status = 'active';
  
  IF total_users = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN server_cost / total_users;
END;
$$;