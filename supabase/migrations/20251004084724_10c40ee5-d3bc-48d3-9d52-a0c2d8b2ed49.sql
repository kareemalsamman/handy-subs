-- expire_date is a generated column, we need to drop the expression first
ALTER TABLE public.subscriptions 
ALTER COLUMN expire_date DROP EXPRESSION;

-- Now make it a regular nullable column
ALTER TABLE public.subscriptions 
ALTER COLUMN expire_date DROP NOT NULL;