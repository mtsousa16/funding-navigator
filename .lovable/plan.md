

# Plano: Substituir Mock por Dados Reais via Edge Function + IA

Vou executar os passos do seu prompt.txt com uma adaptação importante: em vez da API Anthropic (que exigiria uma chave separada), vou usar o **Lovable AI Gateway** que já está configurado e pronto no projeto. O resultado final é idêntico.

## Passo 1 — Criar tabelas no banco

Tabelas `organizations` e `fundings` com RLS público para leitura e insert via service role. Exatamente como você especificou.

## Passo 2 — Edge Function `search-organization`

Mesmo fluxo do seu prompt:
1. Busca cache no banco
2. Chama IA com prompt rigoroso listando as 16+ bases de dados
3. Valida URLs com HEAD request
4. Salva no banco como cache

**Diferença**: usa `https://ai.gateway.lovable.dev/v1/chat/completions` com `LOVABLE_API_KEY` (já configurado) em vez de `api.anthropic.com`. Modelo: `google/gemini-2.5-flash` — rápido e bom para extração estruturada.

## Passo 3 — Hook `useInvestigation.ts`

Substituir pelo seu código — chama a edge function via `supabase.functions.invoke()`, monta grafo, detecta conexões entre buscas.

## Passo 4 — `SearchInput.tsx`

Remover dependência do mockData, aceitar busca livre.

## Passo 5 — Sem ação necessária

`LOVABLE_API_KEY` já existe como secret. Não precisa configurar nada manualmente.

## Passo 6 — Limpeza

`mockData.ts` permanece como referência mas não é mais importado pelo hook.

---

### Resumo técnico

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabelas `organizations` + `fundings` com RLS |
| `supabase/functions/search-organization/index.ts` | Criar — Lovable AI Gateway |
| `src/hooks/useInvestigation.ts` | Substituir — chamar edge function |
| `src/components/SearchInput.tsx` | Simplificar — remover mock |

