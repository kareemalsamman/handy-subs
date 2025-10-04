-- Add tracking fields to prevent duplicate reminders
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS one_month_reminder_sent boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS one_week_reminder_sent boolean NOT NULL DEFAULT false;