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
  'climaesociedade.org', 'comua.org.br'
]

async function searchWithClaude(query: string): Promise<any> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        }
      ],
      messages: [
        {
          role: 'user',
          content: `Você é um pesquisador investigativo especializado em rastrear financiamentos de ONGs e mídias independentes no Brasil.

Sua tarefa: pesquisar financiamentos REAIS e verificáveis da organização "${query}".

INSTRUÇÕES — execute cada busca abaixo usando a ferramenta web_search:

1. "${query}" site:fundobrasil.org.br
2. "${query}" site:fordfoundation.org
3. "${query}" site:opensocietyfoundations.org
4. "${query}" site:macfound.org
5. "${query}" site:ned.org
6. "${query}" site:brazilfoundation.org
7. "${query}" site:ibirapitanga.org.br
8. "${query}" site:mapaosc.ipea.gov.br
9. "${query}" site:ashoka.org
10. "${query}" financiamento grant apoio doação Brasil
11. "${query}" parceiros financiadores relatório anual

REGRAS CRÍTICAS:
- Use APENAS URLs reais retornadas pelas buscas acima — NUNCA invente ou construa URLs
- Se uma busca não retornar resultado para aquela organização, não inclua aquele financiador
- O campo source_url deve ser a URL exata da página encontrada, não a URL base do site
- Se não encontrar nenhum financiamento verificável, retorne fundings como array vazio

Responda APENAS com JSON válido, sem markdown, sem explicações:
{
  "organization": {
    "name": "nome oficial completo encontrado nas buscas",
    "aliases": ["outros nomes encontrados"],
    "type": "ngo",
    "country": "Brasil",
    "description": "descrição baseada no que encontrou",
    "website": "site oficial se encontrado"
  },
  "fundings": [
    {
      "funder_name": "nome do financiador",
      "amount": 50000,
      "currency": "BRL",
      "year": 2023,
      "source_name": "nome da base de dados",
      "source_url": "URL EXATA retornada pela busca — obrigatório",
      "confidence": "confirmed",
      "notes": "detalhes adicionais se disponível"
    }
  ],
  "network": {
    "partners": ["nomes de organizações parceiras encontradas"],
    "shared_funders_with": [
      {
        "org_name": "nome de outra org que compartilha financiador",
        "shared_funder": "nome do financiador em comum",
        "source_url": "URL que comprova"
      }
    ],
    "coalitions": ["redes e coalizões que participa"]
  }
}`
        }
      ]
    })
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Anthropic API error:', response.status, err)
    throw new Error(`Anthropic API error: ${response.status}`)
  }

  const data = await response.json()

  // Extrai texto da resposta — pode vir após blocos tool_use
  let resultText = ''
  for (const block of data.content || []) {
    if (block.type === 'text') {
      resultText += block.text
    }
  }

  console.log('Claude raw response:', resultText.substring(0, 500))

  try {
    const clean = resultText.replace(/```json|```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
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
      return new Response(JSON.stringify({ error: 'Query obrigatória' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Verifica cache no banco
    const { data: cachedOrg } = await supabase
      .from('organizations')
      .select('id, name, aliases, type, country, description')
      .ilike('name', `%${query}%`)
      .maybeSingle()

    if (cachedOrg) {
      const { data: cachedFundings } = await supabase
        .from('fundings')
        .select('*')
        .eq('organization_id', cachedOrg.id)

      if (cachedFundings && cachedFundings.length > 0) {
        console.log('Returning from cache:', cachedOrg.name)
        return new Response(JSON.stringify({
          organization: cachedOrg,
          fundings: cachedFundings,
          network: null,
          fromCache: true
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // 2. Pesquisa real com web search via Claude
    console.log('Searching with Claude for:', query)
    const result = await searchWithClaude(query)

    if (!result) {
      return new Response(JSON.stringify({
        error: 'Não foi possível processar a resposta da IA',
        suggestion: 'Tente novamente com o nome completo da organização'
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Filtra apenas fundings com URLs de domínios conhecidos
    const verifiedFundings = (result.fundings || []).filter((f: any) => {
      if (!f.source_url) return false
      return KNOWN_DOMAINS.some(domain => f.source_url.includes(domain))
    })

    console.log(`Found ${result.fundings?.length || 0} fundings, ${verifiedFundings.length} verified`)

    // 4. Salva no banco
    const { data: orgInserted } = await supabase
      .from('organizations')
      .upsert({
        name: result.organization?.name || query,
        aliases: result.organization?.aliases || [],
        type: result.organization?.type || 'ngo',
        country: result.organization?.country || 'Brasil',
        description: result.organization?.description || null
      }, { onConflict: 'name' })
      .select()
      .maybeSingle()

    if (orgInserted && verifiedFundings.length > 0) {
      await supabase.from('fundings').insert(
        verifiedFundings.map((f: any) => ({
          organization_id: orgInserted.id,
          funder_name: f.funder_name,
          amount: f.amount || null,
          currency: f.currency || 'BRL',
          year: f.year || null,
          source_name: f.source_name,
          source_url: f.source_url,
          confidence: f.confidence || 'confirmed'
        }))
      )
    }

    return new Response(JSON.stringify({
      organization: result.organization,
      fundings: verifiedFundings,
      network: result.network || null,
      fromCache: false,
      totalFound: result.fundings?.length || 0,
      totalVerified: verifiedFundings.length
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('search-organization error:', err)
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Erro interno'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
