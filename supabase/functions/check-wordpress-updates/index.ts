import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domainId } = await req.json();

    if (!domainId) {
      throw new Error('Domain ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get domain details
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .single();

    if (domainError || !domain) {
      throw new Error('Domain not found');
    }

    if (!domain.wordpress_secret_key) {
      throw new Error('WordPress secret key not configured');
    }

    // Call WordPress site to check for updates
    // Strip any existing protocol from domain_url
    const cleanDomain = domain.domain_url.replace(/^https?:\/\//, '');
    const wpUrl = `https://${cleanDomain}?updatestatus=true&key=${domain.wordpress_secret_key}&format=json`;
    
    console.log(`Checking updates for: ${cleanDomain}`);

    let response = await fetch(wpUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'WordPress-Update-Manager/1.0',
      },
    });

    // Fallback: retry with www. prefix if initial request failed
    if (!response.ok) {
      const hasWww = cleanDomain.startsWith('www.');
      if (!hasWww) {
        const wpUrlWithWww = `https://www.${cleanDomain}?updatestatus=true&key=${domain.wordpress_secret_key}&format=json`;
        console.log(`Initial request failed with status ${response.status}. Retrying with: www.${cleanDomain}`);
        response = await fetch(wpUrlWithWww, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'WordPress-Update-Manager/1.0',
          },
        });
      }
    }

    if (!response.ok) {
      throw new Error(`WordPress site returned status: ${response.status}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (_) {
      const text = await response.text();
      console.log('Non-JSON response received from WordPress:', text?.slice(0, 200));
      // Default to no updates if response isn't JSON to avoid hard failures
      data = { wordpress_update: false, plugins_count: 0, themes_count: 0 };
    }

    // Update domain with latest status
    const { error: updateError } = await supabase
      .from('domains')
      .update({
        last_checked: new Date().toISOString(),
        wordpress_update_available: data.wordpress_update || false,
        plugins_updates_count: data.plugins_count || 0,
        themes_updates_count: data.themes_count || 0,
      })
      .eq('id', domainId);

    if (updateError) {
      console.error('Failed to update domain:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        updates: {
          wordpress: data.wordpress_update || false,
          plugins: data.plugins_count || 0,
          themes: data.themes_count || 0,
        },
        last_checked: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking WordPress updates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});