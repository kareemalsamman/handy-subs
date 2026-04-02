-- Add categories column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS categories jsonb DEFAULT '["Ajad", "Soft", "Spex", "Almas", "Others"]'::jsonb;

-- Update existing rows to have the default categories
UPDATE settings SET categories = '["Ajad", "Soft", "Spex", "Almas", "Others"]'::jsonb WHERE categories IS NULL;

-- Change users.company from enum to text to allow dynamic categories
ALTER TABLE users ALTER COLUMN company TYPE text USING company::text;
