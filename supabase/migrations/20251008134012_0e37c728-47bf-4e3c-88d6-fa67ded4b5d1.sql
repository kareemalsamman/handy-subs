-- First, add the new capitalized values to the enum if they don't exist
DO $$ 
BEGIN
    -- Check and add capitalized values
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Ajad' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'company_type')) THEN
        ALTER TYPE company_type ADD VALUE 'Ajad';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Soft' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'company_type')) THEN
        ALTER TYPE company_type ADD VALUE 'Soft';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Spex' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'company_type')) THEN
        ALTER TYPE company_type ADD VALUE 'Spex';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Almas' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'company_type')) THEN
        ALTER TYPE company_type ADD VALUE 'Almas';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Others' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'company_type')) THEN
        ALTER TYPE company_type ADD VALUE 'Others';
    END IF;
END $$;

-- Now update the users table
-- We need to temporarily change the column type to text, update values, then change back
ALTER TABLE users ALTER COLUMN company TYPE text;

UPDATE users SET company = 'Soft' WHERE company = 'soft';
UPDATE users SET company = 'Spex' WHERE company = 'spex';
UPDATE users SET company = 'Almas' WHERE company = 'almas';
UPDATE users SET company = 'Others' WHERE company = 'others';

-- Change the column back to the enum type
ALTER TABLE users ALTER COLUMN company TYPE company_type USING company::company_type;