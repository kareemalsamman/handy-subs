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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running scheduled WordPress updates...');

    // Get settings to check if auto-updates are enabled
    const { data: settings } = await supabase
      .from('settings')
      .select('auto_wordpress_updates_enabled')
      .single();

    if (!settings?.auto_wordpress_updates_enabled) {
      console.log('Auto-updates are disabled');
      return new Response(
        JSON.stringify({ message: 'Auto-updates disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all domains with WordPress configured
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select('*')
      .not('wordpress_secret_key', 'is', null);

    if (domainsError || !domains) {
      throw new Error('Failed to fetch domains');
    }

    console.log(`Found ${domains.length} WordPress sites to update`);

    const results = [];

    for (const domain of domains) {
      try {
        // Strip any existing protocol from domain_url
        const cleanDomain = domain.domain_url.replace(/^https?:\/\//, '');
        const updateUrl = `https://${cleanDomain}?fullupdate=true&key=${domain.wordpress_secret_key}`;
        
        console.log(`Triggering update for: ${cleanDomain}`);

        const response = await fetch(updateUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'WordPress-Update-Manager/1.0',
          },
        });

        const status = response.ok ? 'success' : 'failed';
        const details = response.ok 
          ? 'Updates completed successfully' 
          : `Update failed with status: ${response.status}`;

        // Log the update
        await supabase.from('wordpress_update_logs').insert({
          domain_id: domain.id,
          status,
          details,
        });

        // Update last_checked timestamp
        await supabase
          .from('domains')
          .update({ last_checked: new Date().toISOString() })
          .eq('id', domain.id);

        results.push({
          domain: domain.domain_url,
          status,
          details,
        });

      } catch (error) {
        console.error(`Error updating ${domain.domain_url}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await supabase.from('wordpress_update_logs').insert({
          domain_id: domain.id,
          status: 'error',
          details: errorMessage,
        });

        results.push({
          domain: domain.domain_url,
          status: 'error',
          details: errorMessage,
        });
      }
    }

    console.log('WordPress updates completed');

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total: domains.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error running WordPress updates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});