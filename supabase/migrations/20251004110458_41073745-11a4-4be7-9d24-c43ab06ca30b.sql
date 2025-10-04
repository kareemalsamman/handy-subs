-- Step 1: Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create role checking function with proper search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 4: Add search_path to existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_subscription_status()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    UPDATE public.subscriptions
    SET status = 'expired'
    WHERE expire_date < CURRENT_DATE
    AND status = 'active'
    AND cancelled_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_cost_per_user()
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Step 5: Update RLS policies for all tables to require admin role
DROP POLICY IF EXISTS "Admin full access to users" ON public.users;
CREATE POLICY "Only admins can access users" ON public.users
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin full access to subscriptions" ON public.subscriptions;
CREATE POLICY "Only admins can access subscriptions" ON public.subscriptions
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin full access to domains" ON public.domains;
CREATE POLICY "Only admins can access domains" ON public.domains
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin full access to settings" ON public.settings;
CREATE POLICY "Only admins can access settings" ON public.settings
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin full access to sms_logs" ON public.sms_logs;
CREATE POLICY "Only admins can access sms_logs" ON public.sms_logs
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin full access to notifications" ON public.notifications;
CREATE POLICY "Only admins can access notifications" ON public.notifications
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin full access to wordpress_update_logs" ON public.wordpress_update_logs;
CREATE POLICY "Only admins can access wordpress_update_logs" ON public.wordpress_update_logs
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Step 6: RLS policy for user_roles table itself
CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));