import { useState, useCallback } from 'react';
import { InvestigationState, GraphNode, GraphEdge, Funding, ConnectionInsight, SearchResult } from '@/types/funding';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'mapa-financiamentos-investigation';

function loadState(): InvestigationState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { searchHistory: [], allNodes: [], allEdges: [], allFundings: [], allRelations: [] };
}

function saveState(state: InvestigationState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mapToFunding(f: any, orgId: string): Funding {
  return {
    id: f.id || `f-${Math.random()}`,
    organizationId: orgId,
    funderId: f.funder_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
    funderName: f.funder_name,
    amount: f.amount ?? undefined,
    currency: f.currency || 'USD',
    year: f.year ?? undefined,
    sourceName: f.source_name,
    sourceUrl: f.source_url,
    confidence: f.confidence === 'confirmed' ? 'confirmed' : 'inferred',
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
      const { data, error } = await supabase.functions.invoke('search-organization', {
        body: { query }
      });

      if (error) throw new Error(error.message);
      if (!data || !data.fundings) throw new Error(data?.error || 'Nenhum resultado encontrado');

      const orgId = data.organization?.id || `org-${query.toLowerCase().replace(/\s+/g, '-')}`;
      const fundings: Funding[] = data.fundings.map((f: any) => mapToFunding(f, orgId));

      const org = {
        id: orgId,
        name: data.organization?.name || query,
        aliases: data.organization?.aliases || [],
        type: data.organization?.type || 'ngo',
        country: data.organization?.country || 'Brasil',
        description: data.organization?.description,
      };

      // Detecta conexões com buscas anteriores
      const connections: ConnectionInsight[] = [];
      if (state.searchHistory.length > 0) {
        const existingFunderIds = new Set(state.allFundings.map(f => f.funderId));
        fundings.forEach(f => {
          if (existingFunderIds.has(f.funderId)) {
            const relatedOrgs = state.allFundings
              .filter(ef => ef.funderId === f.funderId)
              .map(ef => {
                const o = state.allNodes.find(n => n.id === ef.organizationId);
                return o?.label || ef.organizationId;
              });
            connections.push({
              message: `${org.name} compartilha o financiador "${f.funderName}" com ${[...new Set(relatedOrgs)].join(', ')}`,
              type: 'shared_funder',
              relatedOrgs: [...new Set(relatedOrgs)],
            });
          }
        });
      }

      // Monta grafo
      const nodes: GraphNode[] = [{ id: org.id, label: org.name, type: 'organization' }];
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
          label: f.amount ? `${f.currency} ${f.amount.toLocaleString()}` : undefined,
        });
      });

      const result: SearchResult = {
        organization: org,
        fundings,
        relations: [],
        graphNodes: nodes,
        graphEdges: edges,
        connections: [...new Map(connections.map(c => [c.message, c])).values()],
      };

      setState(prev => {
        const newNodes = [...prev.allNodes];
        const newEdges = [...prev.allEdges];
        const existingNodeIds = new Set(prev.allNodes.map(n => n.id));
        const existingEdgeIds = new Set(prev.allEdges.map(e => e.id));

        nodes.forEach(n => { if (!existingNodeIds.has(n.id)) { newNodes.push(n); existingNodeIds.add(n.id); } });
        edges.forEach(e => { if (!existingEdgeIds.has(e.id)) { newEdges.push(e); existingEdgeIds.add(e.id); } });

        const newState: InvestigationState = {
          searchHistory: [...new Set([...prev.searchHistory, query])],
          allNodes: newNodes,
          allEdges: newEdges,
          allFundings: [...prev.allFundings, ...fundings.filter(f => !prev.allFundings.some(ef => ef.id === f.id))],
          allRelations: prev.allRelations,
        };
        saveState(newState);
        return newState;
      });

      setLastResult(result);
      return result;

    } catch (err: any) {
      setSearchError(err.message || 'Erro ao buscar dados');
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [state]);

  const clearInvestigation = useCallback(() => {
    const empty: InvestigationState = { searchHistory: [], allNodes: [], allEdges: [], allFundings: [], allRelations: [] };
    setState(empty);
    setLastResult(null);
    setSearchError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { state, lastResult, isSearching, searchError, search, clearInvestigation };
}
