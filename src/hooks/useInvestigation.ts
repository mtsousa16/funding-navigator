import { useState, useCallback } from 'react';
import { InvestigationState, GraphNode, GraphEdge, Funding, Relation, ConnectionInsight, SearchResult } from '@/types/funding';
import { searchOrganizations, getFundingsForOrg, getRelationsForOrg, buildGraphForOrg } from '@/data/mockData';

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

export function useInvestigation() {
  const [state, setState] = useState<InvestigationState>(loadState);
  const [lastResult, setLastResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (query: string): Promise<SearchResult | null> => {
    setIsSearching(true);
    
    // Simulate search delay
    await new Promise(r => setTimeout(r, 800));

    const orgs = searchOrganizations(query);
    if (orgs.length === 0) {
      setIsSearching(false);
      return null;
    }

    const org = orgs[0];
    const fundings = getFundingsForOrg(org.id);
    const relations = getRelationsForOrg(org.id);
    const { nodes, edges } = buildGraphForOrg(org.id);

    // Find connections with previous searches
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

    const result: SearchResult = {
      organization: org,
      fundings,
      relations,
      graphNodes: nodes,
      graphEdges: edges,
      connections: [...new Map(connections.map(c => [c.message, c])).values()],
    };

    // Merge into investigation state
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
        allFundings: [...prev.allFundings, ...fundings.filter(f => !prev.allFundings.some(ef => ef.id === f.id))],
        allRelations: [...prev.allRelations, ...relations.filter(r => !prev.allRelations.some(er => er.id === r.id))],
      };
      saveState(newState);
      return newState;
    });

    setLastResult(result);
    setIsSearching(false);
    return result;
  }, [state]);

  const clearInvestigation = useCallback(() => {
    const empty: InvestigationState = { searchHistory: [], allNodes: [], allEdges: [], allFundings: [], allRelations: [] };
    setState(empty);
    setLastResult(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { state, lastResult, isSearching, search, clearInvestigation };
}
