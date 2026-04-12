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
import { Search, Lock, Share2, Network, Clock, Building2, Trash2, ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';
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
      toast({ title: 'Limite atingido', description: 'Você usou todas as suas buscas deste mês. Adquira um plano para continuar.', variant: 'destructive' });
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
        funderName: funding.funderName,
        amount: funding.amount,
        currency: funding.currency,
        year: funding.year,
        sourceName: funding.sourceName,
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
    <div className="space-y-4 max-w-lg mx-auto pb-16">
      {/* Header */}
      <div className="sticky top-0 bg-card z-40 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">🔍 GrandeIrmão</h1>
          {!isAdmin && (
            <span className="text-xs text-muted-foreground">
              {remaining > 0 ? `${remaining} busca${remaining > 1 ? 's' : ''}` : '0 buscas'}
            </span>
          )}
        </div>
      </div>

      <div className="px-4">
        <SearchInput onSearch={handleSearch} isLoading={isSearching} />
      </div>

      {!canSearch && (
        <div className="mx-4 p-4 rounded-lg bg-secondary border border-border text-center space-y-2">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-semibold">Limite de buscas atingido</p>
          <p className="text-xs text-muted-foreground">Adquira um plano pago para continuar pesquisando.</p>
          <Button size="sm" className="mt-2">Ver planos</Button>
        </div>
      )}

      {/* Floating action buttons when there's investigation data */}
      {hasInvestigation && (
        <div className="px-4 flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={showGraph ? 'default' : 'outline'}
            onClick={() => setShowGraph(!showGraph)}
            className="gap-1"
          >
            <Network className="h-4 w-4" />
            Grafo
            {showGraph ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button
            size="sm"
            variant={showStats ? 'default' : 'outline'}
            onClick={() => setShowStats(!showStats)}
            className="gap-1"
          >
            <BarChart3 className="h-4 w-4" />
            Stats
          </Button>
          <Button
            size="sm"
            variant={showTable ? 'default' : 'outline'}
            onClick={() => setShowTable(!showTable)}
            className="gap-1"
          >
            <Building2 className="h-4 w-4" />
            Tabela
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onClearInvestigation}
            className="gap-1 text-destructive border-destructive/30"
          >
            <Trash2 className="h-4 w-4" />
            Limpar
          </Button>
          <GraphLegend />
        </div>
      )}

      {/* Force Graph panel */}
      {showGraph && hasInvestigation && (
        <div className="mx-4 rounded-lg bg-card border border-border overflow-hidden">
          <div className="p-2">
            <p className="text-xs text-muted-foreground px-2 pb-1">
              {state.allNodes.length} nós · {state.allEdges.length} conexões
            </p>
            <div className="rounded-lg bg-background/50 overflow-hidden" style={{ height: 350 }}>
              <ForceGraph
                nodes={state.allNodes}
                edges={state.allEdges}
                width={600}
                height={350}
                onNodeClick={handleNodeClick}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats panel */}
      {showStats && hasInvestigation && (
        <div className="mx-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Card className="bg-card border-border">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {state.allNodes.filter((n: GraphNode) => n.type === 'organization').length}
                </p>
                <p className="text-[10px] text-muted-foreground">Organizações</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-500">
                  {state.allNodes.filter((n: GraphNode) => n.type === 'funder').length}
                </p>
                <p className="text-[10px] text-muted-foreground">Financiadores</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {state.searchHistory.length}
                </p>
                <p className="text-[10px] text-muted-foreground">Buscas</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-wrap gap-1">
            {state.searchHistory.map((q: string) => (
              <Badge key={q} variant="secondary" className="text-xs">{q}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Table panel */}
      {showTable && allFundings.length > 0 && (
        <div className="mx-4 rounded-lg bg-card border border-border overflow-x-auto">
          <FundingTable fundings={allFundings} />
        </div>
      )}

      {allResults.length > 0 && (
        <TopicFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      )}

      {lastResult?.connections && lastResult.connections.length > 0 && (
        <ConnectionsAlert connections={lastResult.connections} />
      )}

      {/* Results */}
      <div className="space-y-4 px-4">
        {filtered.map((group) => (
          <div key={group.orgName} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4">
              <h3 className="font-bold text-lg">{group.orgName}</h3>
              <p className="text-xs text-muted-foreground">{group.fundings.length} registro(s)</p>
            </div>
            {group.fundings.slice(0, 5).map(f => (
              <div key={f.id} className="px-4 py-3 border-t border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{f.funderName}</p>
                    {f.amount && (
                      <p className="text-base font-bold text-primary">
                        {f.currency} {f.amount.toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{f.year && `${f.year} · `}{f.sourceName}</p>
                  </div>
                  <div className="flex gap-1 items-center">
                    {isAdmin ? (
                      f.sourceUrl && (
                        <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          📑 Fonte
                        </a>
                      )
                    ) : (
                      <div className="relative">
                        <div className="backdrop-blur-sm bg-secondary/80 rounded px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          <span>Fonte Premium</span>
                        </div>
                      </div>
                    )}
                    <button onClick={() => handleShareToFeed(f)} className="ml-2 text-muted-foreground hover:text-primary transition-colors" title="Compartilhar no feed">
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {allResults.length === 0 && !isSearching && (
        <div className="text-center py-16 space-y-4">
          <Search className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Pesquise uma organização para começar.</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {['Ford Foundation', 'ANTRA', 'Conectas'].map(s => (
              <button
                key={s}
                onClick={() => handleSearch(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {isSearching && (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
