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

function mapGrantToFunding(g: any, orgId: string): Funding {
  return {
    id: `grant-${g.id || Math.random()}`,
    organizationId: orgId,
    funderId: (g.funder_name || g.title || 'grant')
      .toLowerCase()
      .replace(/\s+/g, '-'),
    funderName: g.funder_name || g.title || 'Grant',
    amount: g.amount ?? (g.total_amount
      ? Number(String(g.total_amount).replace(/[^\d.]/g, ''))
      : undefined),
    currency: g.currency || 'USD',
    year: g.year ? Number(g.year) : undefined,
    sourceName: g.source_name || g.grantee_name,
    sourceUrl: g.source_url || g.url,
    confidence: 'confirmed' as const,
    description: g.notes || (g.topic ? `Tema: ${g.topic}` : undefined)
  };
}

export function useInvestigation() {
  const [state, setState] = useState<InvestigationState>(loadState);
  const [lastResult, setLastResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const search = useCallback(async (query: string): Promise<SearchResult | null> => {
    setIsSearching(true);
    setSearchError(null);

    try {
      // 1. Busca direta na tabela grants
      const { data: grants, error: grantsError } = await supabase
        .from('grants')
        .select('*')
        .or(`grantee_name.ilike.%${query}%,title.ilike.%${query}%`)
        .limit(100);

      if (grantsError) throw new Error(grantsError.message);

      let fundingsRaw: any[] = [];

      if (grants && grants.length > 0) {
        console.log(`✅ Encontrado no banco: ${grants.length}`);
        fundingsRaw = grants;
      } else {
        console.log("⚠️ Não achou no banco, tentando edge function...");
        const { data, error } = await supabase.functions.invoke(
          'search-organization',
          { body: { query } }
        );
        if (error) throw new Error(error.message);
        fundingsRaw = data?.fundings || [];
      }

      const orgId = `org-${query.toLowerCase().replace(/\s+/g, '-')}`;
      const org = {
        id: orgId,
        name: query,
        aliases: [],
        type: 'ngo' as const,
        country: 'Brasil',
        description: undefined
      };

      const fundings: Funding[] = fundingsRaw
        .map((f: any) => mapGrantToFunding(f, orgId))
        .sort((a, b) => {
          if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
          return (b.amount || 0) - (a.amount || 0);
        });

      // Conexões: shared funder, topic, year
      const connections: ConnectionInsight[] = [];

      if (state.allFundings.length > 0) {
        const existingFunderIds = new Set(state.allFundings.map(f => f.funderId));
        const seenMessages = new Set<string>();

        fundings.forEach(f => {
          // Shared funder
          if (existingFunderIds.has(f.funderId)) {
            const relatedOrgs = [...new Set(
              state.allFundings
                .filter(ef => ef.funderId === f.funderId)
                .map(ef => {
                  const o = state.allNodes.find(n => n.id === ef.organizationId);
                  return o?.label || ef.organizationId;
                })
            )];
            const msg = `${org.name} compartilha financiador "${f.funderName}" com ${relatedOrgs.join(', ')}`;
            if (!seenMessages.has(msg)) {
              seenMessages.add(msg);
              connections.push({ message: msg, type: 'shared_funder', relatedOrgs });
            }
          }

          // Shared year
          if (f.year) {
            const sameYear = state.allFundings.filter(ef => ef.year === f.year && ef.organizationId !== orgId);
            if (sameYear.length > 0) {
              const relatedOrgs = [...new Set(sameYear.map(ef => {
                const o = state.allNodes.find(n => n.id === ef.organizationId);
                return o?.label || ef.organizationId;
              }))];
              const msg = `Financiamentos no mesmo ano (${f.year}) com ${relatedOrgs.join(', ')}`;
              if (!seenMessages.has(msg)) {
                seenMessages.add(msg);
                connections.push({ message: msg, type: 'pattern', relatedOrgs });
              }
            }
          }
        });
      }

      // Grafo
      const nodes: GraphNode[] = [
        { id: org.id, label: org.name, type: 'organization' }
      ];
      const edges: GraphEdge[] = [];
      const addedNodeIds = new Set([org.id]);

      fundings.forEach(f => {
        if (!addedNodeIds.has(f.funderId)) {
          nodes.push({ id: f.funderId, label: f.funderName, type: 'funder' });
          addedNodeIds.add(f.funderId);
        }
        edges.push({
          id: `edge-${f.id}`,
          source: f.funderId,
          target: org.id,
          type: 'funding',
          label: f.amount ? `${f.currency} ${f.amount.toLocaleString()}` : undefined
        });
      });

      const result: SearchResult = {
        organization: org,
        fundings,
        relations: [],
        graphNodes: nodes,
        graphEdges: edges,
        connections
      };

      setState(prev => {
        const existingNodeIds = new Set(prev.allNodes.map(n => n.id));
        const existingEdgeIds = new Set(prev.allEdges.map(e => e.id));
        const newNodes = [...prev.allNodes, ...nodes.filter(n => !existingNodeIds.has(n.id))];
        const newEdges = [...prev.allEdges, ...edges.filter(e => !existingEdgeIds.has(e.id))];

        const newState: InvestigationState = {
          searchHistory: [...new Set([...prev.searchHistory, query])],
          allNodes: newNodes,
          allEdges: newEdges,
          allFundings: [
            ...prev.allFundings,
            ...fundings.filter(f => !prev.allFundings.some(ef => ef.id === f.id))
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

  return { state, lastResult, isSearching, searchError, search, clearInvestigation };
}
