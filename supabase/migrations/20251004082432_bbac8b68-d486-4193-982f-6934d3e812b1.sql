-- Add domain_cost column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN domain_cost numeric DEFAULT 0;

-- Update existing subscriptions to have 0 domain cost
UPDATE public.subscriptions 
SET domain_cost = 0 
WHERE domain_cost IS NULL;