-- Ensure buy_domain column exists with proper default
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'buy_domain'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN buy_domain boolean DEFAULT false;
  END IF;
END $$;

-- Update any existing null values
UPDATE public.subscriptions SET buy_domain = false WHERE buy_domain IS NULL;

-- Make it not nullable
ALTER TABLE public.subscriptions ALTER COLUMN buy_domain SET NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN buy_domain SET DEFAULT false;