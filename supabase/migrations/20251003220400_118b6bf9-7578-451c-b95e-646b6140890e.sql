-- Create enum for companies
CREATE TYPE public.company_type AS ENUM ('Ajad', 'Soft', 'Spex', 'Almas', 'Others');

-- Create enum for subscription status
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled');

-- Create enum for notification types
CREATE TYPE public.notification_type AS ENUM ('sms_reminder', 'payment_received', 'subscription_cancelled', 'subscription_expiring', 'system_alert');

-- Create enum for SMS status
CREATE TYPE public.sms_status AS ENUM ('success', 'failed', 'pending');

-- Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    company company_type NOT NULL,
    phone_number TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create domains table
CREATE TABLE public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    domain_url TEXT NOT NULL,
    wordpress_admin_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    c_cost DECIMAL(10,2) NOT NULL,
    m_cost DECIMAL(10,2) NOT NULL,
    profit DECIMAL(10,2) GENERATED ALWAYS AS (c_cost - (m_cost * 12)) STORED,
    begin_date DATE NOT NULL,
    expire_date DATE GENERATED ALWAYS AS (begin_date + INTERVAL '365 days') STORED,
    status subscription_status NOT NULL DEFAULT 'active',
    cancelled_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sms_logs table
CREATE TABLE public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status sms_status NOT NULL DEFAULT 'pending',
    response TEXT
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action_url TEXT
);

-- Create settings table
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_phone TEXT NOT NULL DEFAULT '0525143581',
    server_monthly_cost DECIMAL(10,2) NOT NULL DEFAULT 504,
    sms_username TEXT,
    sms_token TEXT,
    sms_source TEXT
);

-- Insert default settings
INSERT INTO public.settings (admin_phone, server_monthly_cost, sms_username, sms_token, sms_source)
VALUES ('0525143581', 504, 'morshed', 'eyJ0eXAiOiJqd3QiLCJhbGciOiJIUzI1NiJ9.eyJmaXJzdF9rZXkiOiI3MDkzNCIsInNlY29uZF9rZXkiOiIzNzg2MTg4IiwiaXNzdWVkQXQiOiIwMS0wOC0yMDI1IDAwOjU5OjQ5IiwidHRsIjo2MzA3MjAwMH0.YgiPiKpDBJjjZYCntmPaAFPwQoOYsNZc0DYISaSPY7U', '0525143581');

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin only access)
-- Users policies
CREATE POLICY "Admin full access to users" ON public.users
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Domains policies
CREATE POLICY "Admin full access to domains" ON public.domains
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Subscriptions policies
CREATE POLICY "Admin full access to subscriptions" ON public.subscriptions
    FOR ALL USING (auth.uid() IS NOT NULL);

-- SMS logs policies
CREATE POLICY "Admin full access to sms_logs" ON public.sms_logs
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Notifications policies
CREATE POLICY "Admin full access to notifications" ON public.notifications
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Settings policies
CREATE POLICY "Admin full access to settings" ON public.settings
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-update subscription status based on expire_date
CREATE OR REPLACE FUNCTION public.update_subscription_status()
RETURNS void AS $$
BEGIN
    UPDATE public.subscriptions
    SET status = 'expired'
    WHERE expire_date < CURRENT_DATE
    AND status = 'active'
    AND cancelled_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX idx_users_company ON public.users(company);
CREATE INDEX idx_users_phone ON public.users(phone_number);
CREATE INDEX idx_domains_user_id ON public.domains(user_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_expire_date ON public.subscriptions(expire_date);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);