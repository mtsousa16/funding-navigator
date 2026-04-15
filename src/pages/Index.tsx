import { useState, useCallback, useEffect } from 'react';
import { SearchInput } from '@/components/SearchInput';
import { InvestigationCard } from '@/components/InvestigationCard';
import { ConnectionsAlert } from '@/components/ConnectionsAlert';
import { TopicFilters, FILTERS } from '@/components/TopicFilters';
import { ForceGraph } from '@/components/ForceGraph';
import { GraphLegend } from '@/components/GraphLegend';
import { FundingTable } from '@/components/FundingTable';
import { SearchResult, Funding, GraphNode } from '@/types/funding';
import { useToast } from '@/hooks/use-toast';
import { Search, Lock, Share2, Network, Clock, Building2, Trash2, ChevronUp, ChevronDown, BarChart3, Shield, Radar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SearchPageProps {
  onSearch: (query: string) => Promise<SearchResult | null>;
  isSearching: boolean;
  lastResult: SearchResult | null;
  canSearch: boolean;
  remaining: number;
  isAdmin: boolean;
  currentUserId?: string;
  state?: any;
  onClearInvestigation?: () => void;
}

function groupByOrg(results: SearchResult[]): { orgName: string; fundings: Funding[] }[] {
  const map = new Map<string, { orgName: string; fundings: Funding[] }>();
  results.forEach(r => {
    const key = r.organization.id;
    if (!map.has(key)) map.set(key, { orgName: r.organization.name, fundings: [] });
    map.get(key)!.fundings.push(...r.fundings);
  });
  return Array.from(map.values());
}

function matchesFilter(fundings: Funding[], filterId: string): boolean {
  const filter = FILTERS.find(f => f.id === filterId);
  if (!filter) return true;
  return fundings.some(f => {
    const text = `${f.funderName} ${f.description || ''} ${f.sourceName || ''}`.toLowerCase();
    return filter.keywords.some(kw => text.includes(kw));
  });
}

export default function SearchPage({ onSearch, isSearching, lastResult, canSearch, remaining, isAdmin, currentUserId, state, onClearInvestigation }: SearchPageProps) {
  const { toast } = useToast();
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    if (lastResult && !allResults.some(r => r.organization.id === lastResult.organization.id)) {
      setAllResults(prev => [lastResult, ...prev]);
    }
  }, [lastResult]);

  const handleSearch = useCallback(async (query: string) => {
    if (!canSearch) {
      toast({ title: 'Limite atingido', description: 'Você usou todas as suas buscas deste mês.', variant: 'destructive' });
      return;
    }
    const result = await onSearch(query);
    if (!result) {
      toast({ title: 'Não encontrado', description: `Nenhum resultado para "${query}".`, variant: 'destructive' });
    }
  }, [onSearch, toast, canSearch]);

  const handleShareToFeed = async (funding: Funding) => {
    if (!currentUserId) return;
    const { error } = await supabase.from('posts').insert({
      user_id: currentUserId,
      content: `📊 Financiamento rastreado: ${funding.funderName} → ${funding.sourceName}`,
      funding_snapshot: {
        funderName: funding.funderName, amount: funding.amount,
        currency: funding.currency, year: funding.year, sourceName: funding.sourceName,
      },
    });
    if (!error) toast({ title: 'Compartilhado no feed!' });
  };

  const handleNodeClick = (node: GraphNode) => {
    toast({
      title: node.label,
      description: `Tipo: ${node.type === 'organization' ? 'Organização' : node.type === 'funder' ? 'Financiador' : 'Pessoa'}`,
    });
  };

  const groups = groupByOrg(allResults);
  const filtered = activeFilter ? groups.filter(g => matchesFilter(g.fundings, activeFilter)) : groups;
  const hasInvestigation = state && state.searchHistory.length > 0;
  const allFundings = allResults.flatMap(r => r.fundings);

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-panel px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/30 animate-pulse-glow">
              <Radar className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-lg font-heading font-bold text-foreground tracking-tight">Investigação</h1>
          </div>
          {!isAdmin && (
            <div className="glass-card px-3 py-1 rounded-full">
              <span className="text-xs text-muted-foreground">
                {remaining > 0 ? <><span className="text-primary font-bold">{remaining}</span> busca{remaining > 1 ? 's' : ''}</> : <span className="text-destructive">0 buscas</span>}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4">
        <SearchInput onSearch={handleSearch} isLoading={isSearching} />
      </div>

      {!canSearch && (
        <div className="mx-4 p-5 rounded-xl glass-panel glow-border text-center space-y-3">
          <Lock className="h-10 w-10 mx-auto text-primary/50" />
          <p className="text-sm font-heading font-semibold text-foreground">Limite de buscas atingido</p>
          <p className="text-xs text-muted-foreground">Adquira um plano para continuar investigando.</p>
          <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20">Ver planos</Button>
        </div>
      )}

      {/* Investigation toolbar */}
      {hasInvestigation && (
        <div className="px-4 flex gap-2 flex-wrap">
          <Button size="sm" variant={showGraph ? 'default' : 'outline'}
            onClick={() => setShowGraph(!showGraph)}
            className={`gap-1 ${showGraph ? 'bg-primary/20 text-primary border-primary/30' : 'border-border/40 glass-card'}`}>
            <Network className="h-4 w-4" /> Grafo
            {showGraph ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant={showStats ? 'default' : 'outline'}
            onClick={() => setShowStats(!showStats)}
            className={`gap-1 ${showStats ? 'bg-primary/20 text-primary border-primary/30' : 'border-border/40 glass-card'}`}>
            <BarChart3 className="h-4 w-4" /> Stats
          </Button>
          <Button size="sm" variant={showTable ? 'default' : 'outline'}
            onClick={() => setShowTable(!showTable)}
            className={`gap-1 ${showTable ? 'bg-primary/20 text-primary border-primary/30' : 'border-border/40 glass-card'}`}>
            <Building2 className="h-4 w-4" /> Tabela
          </Button>
          <Button size="sm" variant="outline" onClick={onClearInvestigation}
            className="gap-1 text-destructive border-destructive/20 glass-card hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" /> Limpar
          </Button>
          <GraphLegend />
        </div>
      )}

      {/* Force Graph */}
      {showGraph && hasInvestigation && (
        <div className="mx-4 rounded-xl glass-panel overflow-hidden glow-border">
          <div className="p-2">
            <p className="text-[10px] text-muted-foreground px-2 pb-1 uppercase tracking-widest">
              {state.allNodes.length} nós · {state.allEdges.length} conexões
            </p>
            <div className="rounded-lg overflow-hidden relative" style={{ height: 350 }}>
              <div className="absolute inset-0 scan-line pointer-events-none opacity-30" />
              <ForceGraph nodes={state.allNodes} edges={state.allEdges} width={600} height={350} onNodeClick={handleNodeClick} />
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {showStats && hasInvestigation && (
        <div className="mx-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-panel rounded-xl p-3 text-center">
              <p className="text-2xl font-heading font-bold text-primary glow-text">
                {state.allNodes.filter((n: GraphNode) => n.type === 'organization').length}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Organizações</p>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <p className="text-2xl font-heading font-bold text-primary/80">
                {state.allNodes.filter((n: GraphNode) => n.type === 'funder').length}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Financiadores</p>
            </div>
            <div className="glass-panel rounded-xl p-3 text-center">
              <p className="text-2xl font-heading font-bold text-foreground">
                {state.searchHistory.length}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Buscas</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {state.searchHistory.map((q: string) => (
              <Badge key={q} className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">{q}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {showTable && allFundings.length > 0 && (
        <div className="mx-4 rounded-xl glass-panel overflow-x-auto">
          <FundingTable fundings={allFundings} />
        </div>
      )}

      {allResults.length > 0 && <TopicFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />}
      {lastResult?.connections && lastResult.connections.length > 0 && <ConnectionsAlert connections={lastResult.connections} />}

      {/* Results */}
      <div className="space-y-3 px-4">
        {filtered.map((group) => (
          <div key={group.orgName} className="glass-panel rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-bold text-lg text-foreground">{group.orgName}</h3>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{group.fundings.length} registro(s) encontrado(s)</p>
            </div>
            {group.fundings.slice(0, 5).map(f => (
              <div key={f.id} className="px-4 py-3 border-t border-border/20 hover:bg-primary/5 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{f.funderName}</p>
                    {f.amount && (
                      <p className="text-lg font-heading font-bold text-primary glow-text">
                        {f.currency} {f.amount.toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{f.year && `${f.year} · `}{f.sourceName}</p>
                  </div>
                  <div className="flex gap-1 items-center shrink-0">
                    {isAdmin ? (
                      f.sourceUrl && (
                        <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline glass-card px-2 py-1 rounded">
                          📑 Fonte
                        </a>
                      )
                    ) : (
                      <div className="glass-card rounded px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Premium
                      </div>
                    )}
                    <button onClick={() => handleShareToFeed(f)} className="ml-1 text-muted-foreground hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary/10">
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {allResults.length === 0 && !isSearching && (
        <div className="text-center py-16 space-y-4 px-4">
          <div className="w-20 h-20 mx-auto rounded-2xl glass-panel flex items-center justify-center glow-border">
            <Search className="h-8 w-8 text-primary/60" />
          </div>
          <div>
            <p className="font-heading font-semibold text-foreground">Inicie sua investigação</p>
            <p className="text-sm text-muted-foreground mt-1">Pesquise organizações para mapear redes de financiamento.</p>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {['Ford Foundation', 'ANTRA', 'Conectas'].map(s => (
              <button key={s} onClick={() => handleSearch(s)}
                className="text-xs px-4 py-2 rounded-full glass-card border-primary/20 text-foreground hover:bg-primary/10 hover:border-primary/40 transition-all duration-200">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {isSearching && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="relative">
            <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 h-10 w-10 border-2 border-primary/20 rounded-full animate-ping" />
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Rastreando...</p>
        </div>
      )}
    </div>
  );
}
