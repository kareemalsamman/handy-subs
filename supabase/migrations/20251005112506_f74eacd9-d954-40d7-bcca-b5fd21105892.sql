-- Drop ALL RLS policies to allow public access without authentication
-- WARNING: This removes all data protection and makes everything publicly accessible

-- Drop policies on users table
DROP POLICY IF EXISTS "Only admins can access users" ON public.users;

-- Drop policies on domains table
DROP POLICY IF EXISTS "Only admins can access domains" ON public.domains;

-- Drop policies on subscriptions table
DROP POLICY IF EXISTS "Only admins can access subscriptions" ON public.subscriptions;

-- Drop policies on notifications table
DROP POLICY IF EXISTS "Only admins can access notifications" ON public.notifications;

-- Drop policies on settings table
DROP POLICY IF EXISTS "Only admins can access settings" ON public.settings;

-- Drop policies on sms_logs table
DROP POLICY IF EXISTS "Only admins can access sms_logs" ON public.sms_logs;

-- Drop policies on user_roles table
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Drop policies on wordpress_update_logs table
DROP POLICY IF EXISTS "Only admins can access wordpress_update_logs" ON public.wordpress_update_logs;

-- Disable RLS on all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wordpress_update_logs DISABLE ROW LEVEL SECURITY;