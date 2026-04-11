import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: 'Query obrigatoria' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar na tabela grants com match amplo
    const { data: grantsData, error: grantsError } = await supabase
      .from('grants')
      .select('grantee_name, title, total_amount, year, topic, url')
      .or(`grantee_name.ilike.%${query}%,title.ilike.%${query}%`)
      .limit(100)

    if (grantsError) {
      console.error('Grants query error:', grantsError)
      return new Response(JSON.stringify({
        organization: { name: query },
        fundings: [],
        error: 'SERVICE_FAILED',
        fallback: true,
        stats: { total: 0 }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Mapear grants para fundings
    const fundings = (grantsData || []).map(g => ({
      funder_name: g.title || g.topic || 'Grant',
      amount: g.total_amount,
      currency: 'USD',
      year: g.year,
      source_name: g.grantee_name,
      source_url: g.url || '',
      confidence: 'confirmed',
      notes: g.topic ? `Tema: ${g.topic}` : null
    })).sort((a, b) => {
      if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0)
      return (b.amount || 0) - (a.amount || 0)
    })

    // Buscar organização no cache
    const { data: cachedOrg } = await supabase
      .from('organizations')
      .select('id, name, aliases, type, country, description')
      .ilike('name', `%${query}%`)
      .maybeSingle()

    const organization = cachedOrg || {
      id: `org-${query.toLowerCase().replace(/\s+/g, '-')}`,
      name: query,
      type: 'ngo',
      country: 'Brasil'
    }

    return new Response(JSON.stringify({
      organization,
      fundings,
      network: null,
      fromCache: !!cachedOrg,
      stats: { total: fundings.length }
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({
      organization: { name: 'unknown' },
      fundings: [],
      error: 'SERVICE_UNAVAILABLE',
      fallback: true,
      stats: { total: 0 }
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})