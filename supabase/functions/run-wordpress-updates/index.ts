import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Small delay between domains to avoid overloading
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || 'check'; // 'check' or 'update'
    const domainId = body?.domain_id || null; // optional: target a single domain
    const updateType = body?.update_type || 'all'; // 'all', 'core', 'plugins', 'themes'

    console.log(`WordPress ${mode} started. Target: ${domainId || 'all domains'}, Type: ${updateType}`);

    // Fetch domains with WordPress credentials
    let query = supabase
      .from('domains')
      .select('id, domain_url, wordpress_admin_url, wordpress_secret_key, user_id')
      .not('wordpress_admin_url', 'is', null)
      .not('wordpress_secret_key', 'is', null);

    if (domainId) {
      query = query.eq('id', domainId);
    }

    const { data: domains, error: domainsError } = await query;

    if (domainsError) {
      throw new Error(`Failed to fetch domains: ${domainsError.message}`);
    }

    if (!domains || domains.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No domains with WordPress credentials found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${domains.length} domain(s) to process`);

    const results = [];

    // Process domains ONE AT A TIME to stay light on resources
    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i];
      const domainResult: any = {
        domain_id: domain.id,
        domain_url: domain.domain_url,
        status: 'pending',
        details: null,
      };

      try {
        // Build the API base URL from wordpress_admin_url
        // e.g., "https://example.com/wp-admin" -> "https://example.com/wp-json/handy-manager/v1"
        let baseUrl = domain.wordpress_admin_url.replace(/\/wp-admin\/?$/, '');
        baseUrl = baseUrl.replace(/\/$/, '');
        const apiBase = `${baseUrl}/wp-json/handy-manager/v1`;

        if (mode === 'check') {
          // PHASE 1: Check for updates
          const statusResponse = await fetch(`${apiBase}/status`, {
            method: 'GET',
            headers: {
              'X-Handy-Secret': domain.wordpress_secret_key,
              'Accept': 'application/json',
            },
          });

          if (!statusResponse.ok) {
            throw new Error(`HTTP ${statusResponse.status}: ${await statusResponse.text()}`);
          }

          const statusData = await statusResponse.json();

          const hasUpdates = statusData.core_update || statusData.plugins_count > 0 || statusData.themes_count > 0;

          // Update domain record with latest status
          await supabase
            .from('domains')
            .update({
              wordpress_update_available: hasUpdates,
              plugins_updates_count: statusData.plugins_count || 0,
              themes_updates_count: statusData.themes_count || 0,
              last_checked: new Date().toISOString(),
            })
            .eq('id', domain.id);

          domainResult.status = 'checked';
          domainResult.details = {
            wp_version: statusData.wp_version,
            core_update: statusData.core_update,
            plugins_count: statusData.plugins_count,
            themes_count: statusData.themes_count,
            plugins: statusData.plugins,
            themes: statusData.themes,
          };

          // Log the check
          await supabase.from('wordpress_update_logs').insert({
            domain_id: domain.id,
            status: 'checked',
            details: JSON.stringify({
              mode: 'check',
              core_update: statusData.core_update,
              plugins_count: statusData.plugins_count,
              themes_count: statusData.themes_count,
            }),
          });

        } else if (mode === 'update') {
          // PHASE 2: Apply updates
          const updateResponse = await fetch(`${apiBase}/update`, {
            method: 'POST',
            headers: {
              'X-Handy-Secret': domain.wordpress_secret_key,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ type: updateType }),
          });

          if (!updateResponse.ok) {
            throw new Error(`HTTP ${updateResponse.status}: ${await updateResponse.text()}`);
          }

          const updateData = await updateResponse.json();

          // After update, mark domain as up-to-date
          await supabase
            .from('domains')
            .update({
              wordpress_update_available: false,
              plugins_updates_count: 0,
              themes_updates_count: 0,
              last_checked: new Date().toISOString(),
            })
            .eq('id', domain.id);

          domainResult.status = 'updated';
          domainResult.details = updateData.results;

          // Log the update
          await supabase.from('wordpress_update_logs').insert({
            domain_id: domain.id,
            status: 'updated',
            details: JSON.stringify({
              mode: 'update',
              type: updateType,
              results: updateData.results,
            }),
          });
        }

      } catch (err: any) {
        console.error(`Error processing ${domain.domain_url}:`, err.message);
        domainResult.status = 'error';
        domainResult.details = { error: err.message };

        // Log the error
        await supabase.from('wordpress_update_logs').insert({
          domain_id: domain.id,
          status: 'error',
          details: JSON.stringify({ mode, error: err.message }),
        });
      }

      results.push(domainResult);

      // Wait 1 second between domains to keep things light
      if (i < domains.length - 1) {
        await sleep(1000);
      }
    }

    const summary = {
      total: results.length,
      checked: results.filter(r => r.status === 'checked').length,
      updated: results.filter(r => r.status === 'updated').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    console.log(`WordPress ${mode} complete:`, summary);

    return new Response(
      JSON.stringify({ success: true, mode, summary, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in run-wordpress-updates:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
