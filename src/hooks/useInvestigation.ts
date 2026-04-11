import { useState, useCallback } from 'react';
import {
  InvestigationState,
  GraphNode,
  GraphEdge,
  Funding,
  ConnectionInsight,
  SearchResult
} from '@/types/funding';

import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'mapa-financiamentos-investigation';

/* ===============================
   💾 STATE STORAGE
================================ */
function loadState(): InvestigationState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    searchHistory: [],
    allNodes: [],
    allEdges: [],
    allFundings: [],
    allRelations: []
  };
}

function saveState(state: InvestigationState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ===============================
   🔄 NORMALIZA FUNDING
================================ */
function mapGrantToFunding(g: any, orgId: string): Funding {
  return {
    id: `grant-${g.id || Math.random()}`,
    organizationId: orgId,
    funderId: (g.title || 'ford-foundation')
      .toLowerCase()
      .replace(/\s+/g, '-'),

    funderName: g.title || 'Ford Foundation',

    amount: g.total_amount
      ? Number(String(g.total_amount).replace(/[^\d.]/g, ''))
      : undefined,

    currency: 'USD',

    year: g.year ? Number(g.year) : undefined,

    sourceName: g.grantee_name,
    sourceUrl: g.url,

    confidence: 'confirmed'
  };
}

/* ===============================
   🚀 HOOK PRINCIPAL
================================ */
export function useInvestigation() {
  const [state, setState] = useState<InvestigationState>(loadState);
  const [lastResult, setLastResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  /* ===============================
     🔎 SEARCH PRINCIPAL
  ================================= */
  const search = useCallback(async (query: string): Promise<SearchResult | null> => {
    setIsSearching(true);
    setSearchError(null);

    try {
      console.log("🔎 Buscando:", query);

      /* ===============================
         🔴 1. BUSCA DIRETA NA TABELA GRANTS
      ================================= */
      const { data: grants, error: grantsError } = await supabase
        .from('grants')
        .select('*')
        .ilike('grantee_name', `%${query}%`);

      if (grantsError) {
        throw new Error(grantsError.message);
      }

      /* ===============================
         🔴 FALLBACK → EDGE FUNCTION
      ================================= */
      let fundingsRaw: any[] = [];

      if (grants && grants.length > 0) {
        console.log(`✅ Encontrado no banco: ${grants.length}`);

        fundingsRaw = grants;

      } else {
        console.log("⚠️ Não achou no banco, usando IA...");

        const { data, error } = await supabase.functions.invoke(
          'search-organization',
          { body: { query } }
        );

        if (error) throw new Error(error.message);
        if (!data?.fundings) throw new Error('Nenhum resultado encontrado');

        fundingsRaw = data.fundings;
      }

      /* ===============================
         🧠 ORGANIZAÇÃO
      ================================= */
      const orgId = `org-${query.toLowerCase().replace(/\s+/g, '-')}`;

      const org = {
        id: orgId,
        name: query,
        aliases: [],
        type: 'ngo' as const,
        country: 'Brasil',
        description: undefined
      };

      /* ===============================
         🔄 MAP FUNDINGS
      ================================= */
      const fundings: Funding[] = fundingsRaw.map((f: any) =>
        mapGrantToFunding(f, orgId)
      );

      /* ===============================
         🔗 CONEXÕES
      ================================= */
      const connections: ConnectionInsight[] = [];

      if (state.allFundings.length > 0) {
        const existingFunderIds = new Set(
          state.allFundings.map(f => f.funderId)
        );

        fundings.forEach(f => {
          if (existingFunderIds.has(f.funderId)) {
            const relatedOrgs = state.allFundings
              .filter(ef => ef.funderId === f.funderId)
              .map(ef => {
                const o = state.allNodes.find(n => n.id === ef.organizationId);
                return o?.label || ef.organizationId;
              });

            connections.push({
              message: `${org.name} compartilha financiador com ${[...new Set(relatedOrgs)].join(', ')}`,
              type: 'shared_funder',
              relatedOrgs: [...new Set(relatedOrgs)],
            });
          }
        });
      }

      /* ===============================
         🧩 GRAFO
      ================================= */
      const nodes: GraphNode[] = [
        { id: org.id, label: org.name, type: 'organization' }
      ];

      const edges: GraphEdge[] = [];
      const addedNodeIds = new Set([org.id]);

      fundings.forEach(f => {
        if (!addedNodeIds.has(f.funderId)) {
          nodes.push({
            id: f.funderId,
            label: f.funderName,
            type: 'funder'
          });
          addedNodeIds.add(f.funderId);
        }

        edges.push({
          id: `edge-${f.id}`,
          source: f.funderId,
          target: org.id,
          type: 'funding',
          label: f.amount
            ? `${f.currency} ${f.amount.toLocaleString()}`
            : undefined
        });
      });

      /* ===============================
         📦 RESULT
      ================================= */
      const result: SearchResult = {
        organization: org,
        fundings,
        relations: [],
        graphNodes: nodes,
        graphEdges: edges,
        connections
      };

      /* ===============================
         💾 STATE GLOBAL
      ================================= */
      setState(prev => {
        const newNodes = [...prev.allNodes];
        const newEdges = [...prev.allEdges];

        const existingNodeIds = new Set(prev.allNodes.map(n => n.id));
        const existingEdgeIds = new Set(prev.allEdges.map(e => e.id));

        nodes.forEach(n => {
          if (!existingNodeIds.has(n.id)) {
            newNodes.push(n);
            existingNodeIds.add(n.id);
          }
        });

        edges.forEach(e => {
          if (!existingEdgeIds.has(e.id)) {
            newEdges.push(e);
            existingEdgeIds.add(e.id);
          }
        });

        const newState: InvestigationState = {
          searchHistory: [...new Set([...prev.searchHistory, query])],
          allNodes: newNodes,
          allEdges: newEdges,
          allFundings: [
            ...prev.allFundings,
            ...fundings.filter(
              f => !prev.allFundings.some(ef => ef.id === f.id)
            )
          ],
          allRelations: prev.allRelations
        };

        saveState(newState);
        return newState;
      });

      setLastResult(result);

      return result;

    } catch (err: any) {
      console.error("❌ ERRO:", err);
      setSearchError(err.message || 'Erro ao buscar dados');
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [state]);

  /* ===============================
     🧹 RESET
  ================================= */
  const clearInvestigation = useCallback(() => {
    const empty: InvestigationState = {
      searchHistory: [],
      allNodes: [],
      allEdges: [],
      allFundings: [],
      allRelations: []
    };

    setState(empty);
    setLastResult(null);
    setSearchError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    state,
    lastResult,
    isSearching,
    searchError,
    search,
    clearInvestigation
  };
}
