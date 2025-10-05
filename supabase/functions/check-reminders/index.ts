import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update expired subscriptions first
    try {
      await supabase.rpc('update_subscription_status');
      console.log('Updated expired subscriptions status.');
    } catch (e) {
      console.error('Failed to update subscription statuses:', e);
    }
    console.log('Checking for subscription reminders...');

    // Get admin phone number and auto messages setting from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('admin_phone, auto_messages_enabled')
      .single();
    
    const adminPhone = settings?.admin_phone || '0525143581';
    const autoMessagesEnabled = settings?.auto_messages_enabled ?? true;

    // If auto messages are disabled, skip sending reminders
    if (!autoMessagesEnabled) {
      console.log('Auto messages are disabled. Skipping reminder checks.');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Auto messages disabled',
          oneMonthReminders: 0,
          oneWeekReminders: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get current date
    const now = new Date();
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    // Find subscriptions expiring in 1 month (±1 day window) that haven't been reminded yet
    const { data: oneMonthSubs, error: oneMonthError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        expire_date,
        c_cost,
        user_id,
        domain_id,
        one_month_reminder_sent,
        domains!inner(domain_url, id),
        users!inner(username, phone_number, id)
      `)
      .eq('status', 'active')
      .is('cancelled_at', null)
      .eq('one_month_reminder_sent', false)
      .gte('expire_date', oneMonthFromNow.toISOString().split('T')[0])
      .lte('expire_date', new Date(oneMonthFromNow.getTime() + 86400000).toISOString().split('T')[0]);

    if (oneMonthError) {
      console.error('Error fetching 1-month reminders:', oneMonthError);
    } else if (oneMonthSubs && oneMonthSubs.length > 0) {
      console.log(`Found ${oneMonthSubs.length} subscriptions expiring in 1 month`);
      
      for (const sub of oneMonthSubs) {
        const expireDate = new Date(sub.expire_date);
        const day = expireDate.getDate().toString().padStart(2, '0');
        const month = (expireDate.getMonth() + 1).toString().padStart(2, '0');
        const year = expireDate.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        
        // User message
        const userMessage = `تذكير! 🔔
عزيزي ${sub.users.username}،
اشتراكك في ${sub.domains.domain_url} سينتهي خلال شهر واحد.
تاريخ الانتهاء: ${formattedDate}
المبلغ السنوي: ${sub.c_cost} ₪
الرجاء التواصل للتجديد قريباً.`;

        // Admin message with customer details
        const adminMessage = `تنبيه اشتراك! 🔔
العميل: ${sub.users.username}
الدومين: ${sub.domains.domain_url}
سينتهي خلال شهر: ${formattedDate}
المبلغ: ${sub.c_cost} ₪
الهاتف: ${sub.users.phone_number}`;

        // Send SMS to user
        await supabase.functions.invoke('send-sms', {
          body: { phone: sub.users.phone_number, message: userMessage }
        });

        // Send SMS to admin
        await supabase.functions.invoke('send-sms', {
          body: { phone: adminPhone, message: adminMessage }
        });

        // Create notification for admin
        await supabase.from('notifications').insert({
          type: 'subscription_expiring',
          title: 'اشتراك سينتهي خلال شهر',
          message: `اشتراك ${sub.users.username} في ${sub.domains.domain_url} سينتهي في ${formattedDate}. الهاتف: ${sub.users.phone_number}`,
          action_url: `/user/${sub.users.id}`,
          user_id: sub.users.id,
        });

        // Mark reminder as sent
        await supabase
          .from('subscriptions')
          .update({ one_month_reminder_sent: true })
          .eq('id', sub.id);

        console.log(`Sent 1-month reminder to user ${sub.users.phone_number} and admin for ${sub.domains.domain_url}`);
      }
    }

    // Find subscriptions expiring in 1 week (±1 day window) that haven't been reminded yet
    const { data: oneWeekSubs, error: oneWeekError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        expire_date,
        c_cost,
        user_id,
        domain_id,
        one_week_reminder_sent,
        domains!inner(domain_url, id),
        users!inner(username, phone_number, id)
      `)
      .eq('status', 'active')
      .is('cancelled_at', null)
      .eq('one_week_reminder_sent', false)
      .gte('expire_date', oneWeekFromNow.toISOString().split('T')[0])
      .lte('expire_date', new Date(oneWeekFromNow.getTime() + 86400000).toISOString().split('T')[0]);

    if (oneWeekError) {
      console.error('Error fetching 1-week reminders:', oneWeekError);
    } else if (oneWeekSubs && oneWeekSubs.length > 0) {
      console.log(`Found ${oneWeekSubs.length} subscriptions expiring in 1 week`);
      
      for (const sub of oneWeekSubs) {
        const expireDate = new Date(sub.expire_date);
        const day = expireDate.getDate().toString().padStart(2, '0');
        const month = (expireDate.getMonth() + 1).toString().padStart(2, '0');
        const year = expireDate.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        
        // User message
        const userMessage = `تنبيه هام! ⚠️
عزيزي ${sub.users.username}،
اشتراكك في ${sub.domains.domain_url} سينتهي خلال أسبوع!
تاريخ الانتهاء: ${formattedDate}
المبلغ السنوي: ${sub.c_cost} ₪
يرجى التجديد في أقرب وقت.`;

        // Admin message with customer details
        const adminMessage = `تنبيه عاجل! ⚠️
العميل: ${sub.users.username}
الدومين: ${sub.domains.domain_url}
سينتهي خلال أسبوع: ${formattedDate}
المبلغ: ${sub.c_cost} ₪
الهاتف: ${sub.users.phone_number}`;

        // Send SMS to user
        await supabase.functions.invoke('send-sms', {
          body: { phone: sub.users.phone_number, message: userMessage }
        });

        // Send SMS to admin
        await supabase.functions.invoke('send-sms', {
          body: { phone: adminPhone, message: adminMessage }
        });

        // Create notification for admin
        await supabase.from('notifications').insert({
          type: 'subscription_expiring',
          title: 'اشتراك سينتهي خلال أسبوع!',
          message: `اشتراك ${sub.users.username} في ${sub.domains.domain_url} سينتهي في ${formattedDate}. الهاتف: ${sub.users.phone_number}`,
          action_url: `/user/${sub.users.id}`,
          user_id: sub.users.id,
        });

        // Mark reminder as sent
        await supabase
          .from('subscriptions')
          .update({ one_week_reminder_sent: true })
          .eq('id', sub.id);

        console.log(`Sent 1-week reminder to user ${sub.users.phone_number} and admin for ${sub.domains.domain_url}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        oneMonthReminders: oneMonthSubs?.length || 0,
        oneWeekReminders: oneWeekSubs?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error checking reminders:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
