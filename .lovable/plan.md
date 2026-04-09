

## Mapa de Financiamentos — Plano de Implementação

### Design
- **Tema**: Dark mode com paleta Midnight Indigo (#0a0a1a, #141432, #1e1e5a, #4f46e5)
- **Tipografia**: Sora (headings) + Manrope (body)
- **Layout**: Dashboard com sidebar colapsável + área principal dividida entre grafo e painéis de dados

### Estrutura do App

**1. Sidebar (navegação)**
- Busca (página principal)
- Minha Investigação (histórico + grafo completo)
- Insights (padrões detectados)

**2. Página de Busca (Home)**
- Campo de busca com autocomplete e normalização de nome
- Ao buscar, exibe:
  - **Painel de Financiamentos**: lista com financiador, valor, ano, fonte (link)
  - **Painel de Relações**: conexões identificadas (mesmos financiadores, co-ocorrência)
  - **Mini-grafo**: visualização das relações da organização buscada
- Tags indicando "confirmado" vs "inferido via IA"

**3. Página "Minha Investigação"**
- Grafo dinâmico interativo (D3.js/force-directed) com todas as buscas acumuladas
- Nós: organizações (azul), financiadores (dourado), pessoas (verde)
- Arestas: financiamento, parceria, co-ocorrência
- Zoom, arrastar, clicar em nós para detalhes
- Seção "Conexões com sua investigação" — cruzamento automático entre buscas

**4. Página de Insights**
- Financiadores recorrentes na rede do usuário
- Clusters de organizações
- Concentração de funding
- Texto em linguagem simples gerado por IA

### Dados
- **Dados mock pré-carregados**: ~20 organizações brasileiras com financiamentos realistas (fundações internacionais, editais nacionais)
- **IA (Lovable AI)**: ao buscar uma organização, a IA enriquece com informações conhecidas sobre financiamentos, conexões e contexto
- Dados armazenados no banco Supabase (PostgreSQL) com tabelas: organizações, financiadores, financiamentos, relações

### Backend (Lovable Cloud)
- **Edge Function "search"**: recebe nome da organização → busca no banco local → chama Lovable AI para enriquecer dados → retorna resultados consolidados
- **Edge Function "insights"**: analisa histórico do usuário e gera padrões via IA
- **Banco de dados**: tabelas para organizações, financiamentos, relações, histórico de buscas do usuário

### Memória do Usuário
- Histórico de buscas salvo no localStorage (MVP, sem autenticação)
- Grafo acumulativo persistido localmente
- Cruzamento automático a cada nova busca

### Transparência
- Cada dado exibe fonte e tipo (confirmado/inferido)
- Badge visual diferenciando dados diretos vs inferidos por IA

