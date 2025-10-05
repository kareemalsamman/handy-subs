-- Add new company values to enum used by users.company
DO $$
BEGIN
  -- Ensure enum exists before altering
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'company_type' AND n.nspname = 'public'
  ) THEN
    ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'Ajad';
    ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'soft';
    ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'spex';
    ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'almas';
    ALTER TYPE public.company_type ADD VALUE IF NOT EXISTS 'others';
  END IF;
END $$;