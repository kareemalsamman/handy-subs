import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message }: SMSRequest = await req.json();

    if (!phone || !message) {
      throw new Error('Phone number and message are required');
    }

    console.log('Sending SMS to:', phone);

    // Generate unique DLR ID
    const dlr = crypto.randomUUID();

    // Build XML payload
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sms>
    <user>
        <username>morshed</username>
    </user>
    <source>0525143581</source>
    <destinations>
        <phone id="${dlr}">${phone}</phone>
    </destinations>
    <message>${message}</message>
</sms>`;

    console.log('SMS XML payload:', xml);

    // Send SMS via API
    const response = await fetch('https://019sms.co.il/api', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJ0eXAiOiJqd3QiLCJhbGciOiJIUzI1NiJ9.eyJmaXJzdF9rZXkiOiI3MDkzNCIsInNlY29uZF9rZXkiOiIzNzg2MTg4IiwiaXNzdWVkQXQiOiIwMS0wOC0yMDI1IDAwOjU5OjQ5IiwidHRsIjo2MzA3MjAwMH0.YgiPiKpDBJjjZYCntmPaAFPwQoOYsNZc0DYISaSPY7U',
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
