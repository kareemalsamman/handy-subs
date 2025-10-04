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

    console.log('Checking for subscription reminders...');

    // Get current date
    const now = new Date();
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    // Find subscriptions expiring in 1 month (±1 day window)
    const { data: oneMonthSubs, error: oneMonthError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        expire_date,
        c_cost,
        user_id,
        domain_id,
        domains!inner(domain_url, id),
        users!inner(username, phone_number, id)
      `)
      .eq('status', 'active')
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
        
        const message = `تذكير! 🔔
عزيزي ${sub.users.username}،
اشتراكك في ${sub.domains.domain_url} سينتهي خلال شهر واحد.
تاريخ الانتهاء: ${formattedDate}
المبلغ السنوي: ${sub.c_cost} ₪
الرجاء التواصل للتجديد قريباً.`;

        // Send SMS to user
        await supabase.functions.invoke('send-sms', {
          body: { phone: sub.users.phone_number, message }
        });

        // Create notification for admin
        await supabase.from('notifications').insert({
          type: 'subscription_expiring',
          title: 'اشتراك سينتهي خلال شهر',
          message: `اشتراك ${sub.users.username} في ${sub.domains.domain_url} سينتهي في ${formattedDate}. الهاتف: ${sub.users.phone_number}`,
          action_url: `/user/${sub.users.id}`,
          user_id: sub.users.id,
        });

        console.log(`Sent 1-month reminder to ${sub.users.phone_number} for ${sub.domains.domain_url}`);
      }
    }

    // Find subscriptions expiring in 1 week (±1 day window)
    const { data: oneWeekSubs, error: oneWeekError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        expire_date,
        c_cost,
        user_id,
        domain_id,
        domains!inner(domain_url, id),
        users!inner(username, phone_number, id)
      `)
      .eq('status', 'active')
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
        
        const message = `تنبيه هام! ⚠️
عزيزي ${sub.users.username}،
اشتراكك في ${sub.domains.domain_url} سينتهي خلال أسبوع!
تاريخ الانتهاء: ${formattedDate}
المبلغ السنوي: ${sub.c_cost} ₪
يرجى التجديد في أقرب وقت.`;

        // Send SMS to user
        await supabase.functions.invoke('send-sms', {
          body: { phone: sub.users.phone_number, message }
        });

        // Create notification for admin
        await supabase.from('notifications').insert({
          type: 'subscription_expiring',
          title: 'اشتراك سينتهي خلال أسبوع!',
          message: `اشتراك ${sub.users.username} في ${sub.domains.domain_url} سينتهي في ${formattedDate}. الهاتف: ${sub.users.phone_number}`,
          action_url: `/user/${sub.users.id}`,
          user_id: sub.users.id,
        });

        console.log(`Sent 1-week reminder to ${sub.users.phone_number} for ${sub.domains.domain_url}`);
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
