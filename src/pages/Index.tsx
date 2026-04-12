import { useState, useCallback, useEffect, useRef } from 'react';
import { SearchInput } from '@/components/SearchInput';
import { InvestigationCard } from '@/components/InvestigationCard';
import { ConnectionsAlert } from '@/components/ConnectionsAlert';
import { TopicFilters, FILTERS } from '@/components/TopicFilters';
import { TacticalDisclaimer } from '@/components/TacticalDisclaimer';
import { SearchResult, GraphNode, Funding } from '@/types/funding';
import { useToast } from '@/hooks/use-toast';
import { Radar, Shield } from 'lucide-react';

interface SearchPageProps {
  onSearch: (query: string) => Promise<SearchResult | null>;
  isSearching: boolean;
  lastResult: SearchResult | null;
}

// Group fundings by organization
function groupByOrg(results: SearchResult[]): { orgName: string; fundings: Funding[] }[] {
  const map = new Map<string, { orgName: string; fundings: Funding[] }>();
  results.forEach(r => {
    const key = r.organization.id;
    if (!map.has(key)) {
      map.set(key, { orgName: r.organization.name, fundings: [] });
    }
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

export default function SearchPage({ onSearch, isSearching, lastResult }: SearchPageProps) {
  const { toast } = useToast();
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastResult && !allResults.some(r => r.organization.id === lastResult.organization.id)) {
      setAllResults(prev => [lastResult, ...prev]);
    }
  }, [lastResult]);

  const handleSearch = useCallback(async (query: string) => {
    const result = await onSearch(query);
    if (!result) {
      toast({
        title: 'Organização não encontrada',
        description: `Nenhum resultado para "${query}".`,
        variant: 'destructive',
      });
    }
  }, [onSearch, toast]);

  const groups = groupByOrg(allResults);
  const filtered = activeFilter
    ? groups.filter(g => matchesFilter(g.fundings, activeFilter))
    : groups;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3 py-6">
        <div className="flex items-center justify-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="font-heading text-2xl font-black tracking-tight uppercase">
            <span className="neon-text">Grande</span>
            <span className="text-foreground">Irmão</span>
          </h1>
        </div>
        <p className="font-mono text-xs text-muted-foreground max-w-md mx-auto">
          Protocolo de auditoria social. Rastreamento de financiamentos e conexões entre organizações.
        </p>
      </div>

      {/* Search */}
      <SearchInput onSearch={handleSearch} isLoading={isSearching} />

      {/* Filters */}
      {allResults.length > 0 && (
        <TopicFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      )}

      {/* Connections */}
      {lastResult?.connections && lastResult.connections.length > 0 && (
        <ConnectionsAlert connections={lastResult.connections} />
      )}

      {/* Feed */}
      <div ref={feedRef} className="space-y-4">
        {filtered.map((group, i) => (
          <InvestigationCard
            key={group.orgName}
            orgName={group.orgName}
            fundings={group.fundings}
            index={i}
            onExpandNetwork={() => {
              toast({
                title: 'Expandir Rede',
                description: `Navegue até Minha Investigação para ver o mapa completo de ${group.orgName}.`,
              });
            }}
          />
        ))}
      </div>

      {/* Empty State */}
      {allResults.length === 0 && !isSearching && (
        <div className="text-center py-20 space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full border border-primary/20 flex items-center justify-center glow-cyan">
            <Radar className="h-10 w-10 text-primary radar-pulse" />
          </div>
          <div className="space-y-3">
            <p className="font-mono text-xs text-muted-foreground">
              Inicie uma varredura pesquisando uma organização.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {['Ford Foundation', 'ANTRA', 'Conectas', 'Geledés'].map(s => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  className="font-mono text-xs px-3 py-1.5 rounded border border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full border border-primary/30 flex items-center justify-center">
            <Radar className="h-6 w-6 text-primary animate-spin" />
          </div>
          <p className="font-mono text-xs text-muted-foreground animate-pulse">
            Rastreando dados...
          </p>
        </div>
      )}

      {/* Stats */}
      {allResults.length > 0 && (
        <div className="flex items-center justify-center gap-6 py-4">
          <div className="text-center">
            <div className="font-mono text-lg font-bold neon-text">{allResults.length}</div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase">Organizações</div>
          </div>
          <div className="w-px h-8 bg-border/30" />
          <div className="text-center">
            <div className="font-mono text-lg font-bold neon-green-text">
              {allResults.reduce((sum, r) => sum + r.fundings.length, 0)}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase">Registros</div>
          </div>
        </div>
      )}

      <TacticalDisclaimer />
    </div>
  );
}
