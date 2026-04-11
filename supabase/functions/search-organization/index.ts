import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const KNOWN_DOMAINS = [
  'fundobrasil.org.br', 'fordfoundation.org', 'opensocietyfoundations.org',
  'macfound.org', 'ned.org', 'brazilfoundation.org', 'ibirapitanga.org.br',
  'mapaosc.ipea.gov.br', 'ashoka.org', 'casa.org.br', 'omidyar.com',
  'rockefellerfoundation.org', 'gatesfoundation.org', 'climateworks.org',
  'serrapilheira.org', 'institutohumanize.org.br', 'idis.org.br',
  'filantropia.ong', 'prosas.com.br', 'echoinggreen.org', 'acumen.org',
  'vetorbrasil.org', 'artemisia.org.br', 'fundacaolemann.org.br',
  'climaesociedade.org', 'comua.org.br', 'heinrich-boell.org',
  'avina.net', 'kellogg.org', 'oxfam.org', 'norad.no',
  'associacaomatria.com', 'globalphilanthropyproject.org'
]

async function searchFundoBrasil(query: string): Promise<any[]> {
  const results: any[] = []
  try {
    const searchUrl = `https://www.fundobrasil.org.br/?s=${encodeURIComponent(query)}&post_type=projeto`
    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) })
    const html = await res.text()
    const projectLinks = [...html.matchAll(/href="(https:\/\/www\.fundobrasil\.org\.br\/projeto\/[^"]+)"/g)]
      .map(m => m[1])
      .filter((v, i, a) => a.indexOf(v) === i)
    for (const link of projectLinks.slice(0, 3)) {
      try {
        const pageRes = await fetch(link, { signal: AbortSignal.timeout(8000) })
        const pageHtml = await pageRes.text()
        const valorMatch = pageHtml.match(/Valor Doado[\s\S]*?R\$\s*([\d.,]+)/i) || pageHtml.match(/R\$\s*([\d.,]+)/i)
        const valor = valorMatch ? valorMatch[1].replace(/\./g, '').replace(',', '.') : null
        const anoMatch = pageHtml.match(/Ano[\s\S]*?(\d{4})/i)
        const ano = anoMatch ? parseInt(anoMatch[1]) : null
        const titleMatch = pageHtml.match(/<title>([^<]+)<\/title>/)
        const title = titleMatch ? titleMatch[1].split('\u2013')[0].trim() : query
        results.push({
          funder_name: 'Fundo Brasil de Direitos Humanos',
          amount: valor ? parseFloat(valor) : null,
          currency: 'BRL',
          year: ano,
          source_name: 'Fundo Brasil de Direitos Humanos',
          source_url: link,
          confidence: 'confirmed',
          notes: `Projeto: ${title}`
        })
      } catch (e) {
        console.error('Error fetching project page:', link, e)
      }
    }
  } catch (e) {
    console.error('Error searching Fundo Brasil:', e)
  }
  return results
}

async function searchWithClaude(query: string, fundoBrasilResults: any[]): Promise<any> {
  const fundoBrasilContext = fundoBrasilResults.length > 0
    ? `\n\nJa encontrei os seguintes financiamentos do Fundo Brasil (NAO precisa buscar la):\n${fundoBrasilResults.map(f => `- ${f.source_url} (${f.year}, ${f.currency} ${f.amount})`).join('\n')}`
    : ''

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 8000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Voce e um pesquisador investigativo especializado em financiamentos de ONGs no Brasil.
${fundoBrasilContext}

Busque financiamentos da organizacao "${query}" usando web_search:

1. "${query}" "Ford Foundation" grant awarded
2. "${query}" "Open Society" grant
3. "${query}" "MacArthur Foundation" grant
4. "${query}" "NED" grant Brazil
5. "${query}" "Mama Cash" grant
6. "${query}" financiamento "relatorio anual" financiadores
7. "${query}" "apoiado por" OR "funded by" foundation
8. "${query}" "ibirapitanga" grant
9. "${query}" "brazilfoundation" apoio

Para cada resultado:
- Use a URL EXATA retornada pela busca
- PDFs com mencao ao financiamento sao fontes validas
- Se nao encontrar valor, deixe amount como null
- NUNCA invente URLs

Responda APENAS com JSON valido, sem markdown:
{
  "organization": {
    "name": "nome oficial",
    "aliases": [],
    "type": "ngo",
    "country": "Brasil",
    "description": "descricao encontrada",
    "website": "site oficial"
  },
  "fundings": [
    {
      "funder_name": "nome do financiador",
      "amount": null,
      "currency": "USD",
      "year": 2022,
      "source_name": "nome da fonte",
      "source_url": "URL EXATA",
      "confidence": "confirmed",
      "notes": "contexto"
    }
  ],
  "network": {
    "partners": [],
    "shared_funders_with": [],
    "coalitions": []
  }
}`
      }]
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error: ${response.status} ${err}`)
  }

  const data = await response.json()
  let resultText = ''
  for (const block of data.content || []) {
    if (block.type === 'text') resultText += block.text
  }

  try {
    const clean = resultText.replace(/```json|```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('Parse error:', e)
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

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

    // Buscar na tabela grants (dados estruturados)
    const { data: grantsData } = await supabase
      .from('grants')
      .select('grantee_name, title, total_amount, year, topic, url')
      .ilike('grantee_name', `%${query}%`)

    const grantsAsFundings = (grantsData || []).map((g: any) => ({
      funder_name: g.title || g.topic || 'Grant',
      amount: g.total_amount,
      currency: 'USD',
      year: g.year,
      source_name: g.grantee_name,
      source_url: g.url || '',
      confidence: 'confirmed',
      notes: g.topic ? `Tema: ${g.topic}` : null,
    }))

    const { data: cachedOrg } = await supabase
      .from('organizations')
      .select('id, name, aliases, type, country, description')
      .ilike('name', `%${query}%`)
      .maybeSingle()

    if (cachedOrg) {
      const { data: cachedFundings } = await supabase
        .from('fundings').select('*').eq('organization_id', cachedOrg.id)
      if (cachedFundings && cachedFundings.length > 0) {
        return new Response(JSON.stringify({
          organization: cachedOrg, fundings: [...cachedFundings, ...grantsAsFundings], network: null, fromCache: true
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    console.log('Searching Fundo Brasil directly for:', query)
    const fundoBrasilResults = await searchFundoBrasil(query)
    console.log(`Fundo Brasil found: ${fundoBrasilResults.length} results`)

    console.log('Searching other funders with Claude for:', query)
    const claudeResult = await searchWithClaude(query, fundoBrasilResults)

    const claudeFundings = claudeResult?.fundings || []
    const allFundings = [...fundoBrasilResults, ...claudeFundings]

    const verifiedFundings = allFundings.filter((f: any) => {
      if (!f.source_url) return false
      return KNOWN_DOMAINS.some(domain => f.source_url.toLowerCase().includes(domain))
    })

    const unverifiedFundings = allFundings.filter((f: any) => {
      if (!f.source_url) return true
      return !KNOWN_DOMAINS.some(domain => f.source_url.toLowerCase().includes(domain))
    }).map((f: any) => ({ ...f, confidence: 'unverified' }))

    const finalFundings = [...verifiedFundings, ...unverifiedFundings]

    const orgData = claudeResult?.organization
    const { data: orgInserted } = await supabase
      .from('organizations')
      .upsert({
        name: orgData?.name || query,
        aliases: orgData?.aliases || [],
        type: orgData?.type || 'ngo',
        country: orgData?.country || 'Brasil',
        description: orgData?.description || null
      }, { onConflict: 'name' })
      .select().maybeSingle()

    if (orgInserted && finalFundings.length > 0) {
      await supabase.from('fundings').insert(
        finalFundings.map((f: any) => ({
          organization_id: orgInserted.id,
          funder_name: f.funder_name,
          amount: f.amount || null,
          currency: f.currency || 'BRL',
          year: f.year || null,
          source_name: f.source_name,
          source_url: f.source_url || null,
          confidence: f.confidence || 'confirmed'
        }))
      )
    }

    return new Response(JSON.stringify({
      organization: claudeResult?.organization || { name: query },
      fundings: finalFundings,
      network: claudeResult?.network || null,
      fromCache: false,
      stats: { total: finalFundings.length, fundo_brasil: fundoBrasilResults.length }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Erro interno'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})