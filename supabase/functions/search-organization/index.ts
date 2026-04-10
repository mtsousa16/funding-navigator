import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { query } = await req.json()
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: 'Query obrigatória' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Busca no cache do banco primeiro
    const { data: cached } = await supabase
      .from('organizations')
      .select('*, fundings(*)')
      .or(`name.ilike.%${query}%,aliases.cs.{${query}}`)
      .limit(1)
      .single()

    if (cached && cached.fundings?.length > 0) {
      return new Response(JSON.stringify({
        organization: cached,
        fundings: cached.fundings,
        fromCache: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Chama a IA com prompt rigoroso
    const prompt = `Você é um pesquisador especializado em financiamento de ONGs no Brasil.

Pesquise financiamentos da organização: "${query}"

REGRAS CRÍTICAS:
- Retorne APENAS financiamentos que você pode confirmar com link direto para uma dessas bases de dados:
  * Ford Foundation: https://www.fordfoundation.org/work/our-grants/grants-database/
  * Open Society Foundations: https://www.opensocietyfoundations.org/grants
  * Rockefeller Foundation: https://www.rockefellerfoundation.org/grants/
  * MacArthur Foundation: https://www.macfound.org/grants
  * Gates Foundation: https://www.gatesfoundation.org/about/committed-grants
  * National Endowment for Democracy: https://www.ned.org/grants/
  * Omidyar Network: https://omidyar.com/work/
  * Fundo Brasil de Direitos Humanos: https://www.fundobrasil.org.br/editais/
  * Instituto Ibirapitanga: https://ibirapitanga.org.br/en/grants/database/
  * BrazilFoundation: https://brazilfoundation.org/quem-apoiamos/
  * Instituto Clima e Sociedade: https://climaesociedade.org/
  * Fundo Casa Socioambiental: https://www.casa.org.br/editais/
  * Rede Filantropia: https://filantropia.ong
  * Mapa das OSCs: https://mapaosc.ipea.gov.br
  * Ashoka Fellows: https://www.ashoka.org/en/fellows
  * Fundação Lemann: https://fundacaolemann.org.br

- NÃO invente dados. Se não tiver certeza do valor exato, omita o campo "amount".
- NÃO gere URLs falsas. Use apenas as URLs base listadas acima como source_url.
- O campo "confidence" deve ser "confirmed" apenas se você tem certeza do financiamento. Use "reported" se foi mencionado em relatórios mas sem link direto.

Responda APENAS com JSON válido, sem markdown, sem explicações:
{
  "organization": {
    "name": "nome oficial",
    "aliases": ["outros nomes"],
    "type": "ngo|foundation|media|collective",
    "country": "Brasil",
    "description": "descrição breve"
  },
  "fundings": [
    {
      "funder_name": "nome do financiador",
      "amount": 250000,
      "currency": "USD",
      "year": 2022,
      "source_name": "nome da base de dados",
      "source_url": "URL da base de dados",
      "confidence": "confirmed"
    }
  ]
}`

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      })
    })

    if (!aiResponse.ok) {
      const status = aiResponse.status
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos no workspace.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const errText = await aiResponse.text()
      console.error('AI gateway error:', status, errText)
      return new Response(JSON.stringify({ error: 'Erro ao consultar IA' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const aiData = await aiResponse.json()
    const rawText = aiData.choices?.[0]?.message?.content || ''

    let parsed: any
    try {
      const clean = rawText.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      console.error('Failed to parse AI response:', rawText)
      return new Response(JSON.stringify({ error: 'IA não retornou JSON válido', raw: rawText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!parsed.fundings || parsed.fundings.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum financiamento encontrado para esta organização' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Valida URLs — muda confidence para 'unverified' se URL retornar 404
    const validatedFundings = await Promise.all(
      parsed.fundings.map(async (f: any) => {
        if (!f.source_url) return { ...f, confidence: 'unverified' }
        try {
          const check = await fetch(f.source_url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(4000)
          })
          if (check.status === 404) return { ...f, confidence: 'unverified' }
        } catch {
          // timeout ou erro de rede — mantém confidence original
        }
        return f
      })
    )

    // 4. Salva no banco (cache)
    const { data: orgInserted } = await supabase
      .from('organizations')
      .insert({
        name: parsed.organization.name,
        aliases: parsed.organization.aliases || [],
        type: parsed.organization.type || 'ngo',
        country: parsed.organization.country || 'Brasil',
        description: parsed.organization.description || null
      })
      .select()
      .single()

    if (orgInserted) {
      await supabase.from('fundings').insert(
        validatedFundings.map((f: any) => ({
          organization_id: orgInserted.id,
          funder_name: f.funder_name,
          amount: f.amount || null,
          currency: f.currency || 'USD',
          year: f.year || null,
          source_name: f.source_name,
          source_url: f.source_url,
          confidence: f.confidence
        }))
      )
    }

    return new Response(JSON.stringify({
      organization: { ...parsed.organization, id: orgInserted?.id },
      fundings: validatedFundings,
      fromCache: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('search-organization error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
