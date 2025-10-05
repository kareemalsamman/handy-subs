import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  message: string;
}

// XML escaping function to prevent injection attacks
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication (accept either a user JWT or the service role key)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
    console.log('send-sms authorization mode:', isServiceRole ? 'service_role' : 'user');

    // Use service role key for internal backend calls, anon key for user-authenticated calls
    const supabaseClient = createClient(
      supabaseUrl,
      isServiceRole ? serviceRoleKey : anonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Only verify user session when not using the service role
    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { phone, message }: SMSRequest = await req.json();

    if (!phone || !message) {
      throw new Error('Phone number and message are required');
    }

    // Validate phone number format (Israeli format: 10 digits starting with 0)
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error('Invalid phone number format. Must be 10 digits starting with 0');
    }

    // Validate message length
    if (message.length > 500) {
      throw new Error('Message too long (max 500 characters)');
    }

    console.log('Sending SMS to:', phone);

    // Get SMS credentials from secrets and settings
    const smsToken = Deno.env.get('SMS_API_TOKEN');
    if (!smsToken) {
      throw new Error('SMS_API_TOKEN not configured');
    }

    // Fetch SMS settings from database
    const { data: settings } = await supabaseClient
      .from('settings')
      .select('sms_username, sms_source')
      .single();

    const smsUsername = settings?.sms_username || 'morshed';
    const smsSource = settings?.sms_source || '0525143581';

    // Generate unique DLR ID
    const dlr = crypto.randomUUID();

    // Build XML payload with properly escaped user inputs
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sms>
    <user>
        <username>${escapeXml(smsUsername)}</username>
    </user>
    <source>${escapeXml(smsSource)}</source>
    <destinations>
        <phone id="${dlr}">${escapeXml(phone)}</phone>
    </destinations>
    <message>${escapeXml(message)}</message>
</sms>`;

    console.log('SMS XML payload created for phone:', phone);

    // Send SMS via API using secret token
    const response = await fetch('https://019sms.co.il/api', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${smsToken}`,
        'Content-Type': 'application/xml',
        'charset': 'utf-8',
      },
      body: xml,
    });

    const responseText = await response.text();
    console.log('SMS API response:', responseText, 'Status:', response.status);

    if (!response.ok) {
      throw new Error(`SMS API returned ${response.status}: ${responseText}`);
    }

    // Log SMS send to database
    await supabaseClient
      .from('sms_logs')
      .insert({
        phone_number: phone,
        message: message,
        status: response.ok ? 'success' : 'failed',
        response: responseText
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS sent successfully',
        response: responseText,
        httpCode: response.status
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error sending SMS:', error);
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
