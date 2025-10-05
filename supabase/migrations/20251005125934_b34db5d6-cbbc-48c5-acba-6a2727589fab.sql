-- Add admin PIN column to settings table
ALTER TABLE public.settings
ADD COLUMN admin_pin text NOT NULL DEFAULT '1997';