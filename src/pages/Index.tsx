import { useState, useCallback } from 'react';
import { SearchInput } from '@/components/SearchInput';
import { FundingTable } from '@/components/FundingTable';
import { RelationsPanel } from '@/components/RelationsPanel';
import { ConnectionsAlert } from '@/components/ConnectionsAlert';
import { ForceGraph } from '@/components/ForceGraph';
import { GraphLegend } from '@/components/GraphLegend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchResult, GraphNode } from '@/types/funding';
import { useToast } from '@/hooks/use-toast';
import { Building2, DollarSign, Link2, Network } from 'lucide-react';

interface SearchPageProps {
  onSearch: (query: string) => Promise<SearchResult | null>;
  isSearching: boolean;
  lastResult: SearchResult | null;
}

export default function SearchPage({ onSearch, isSearching, lastResult }: SearchPageProps) {
  const { toast } = useToast();

  const handleSearch = useCallback(async (query: string) => {
    const result = await onSearch(query);
    if (!result) {
      toast({
        title: 'Organização não encontrada',
        description: `Nenhum resultado para "${query}". Tente uma variação do nome.`,
        variant: 'destructive',
      });
    }
  }, [onSearch, toast]);

  const handleNodeClick = (node: GraphNode) => {
    toast({
      title: node.label,
      description: `Tipo: ${node.type === 'organization' ? 'Organização' : node.type === 'funder' ? 'Financiador' : 'Pessoa'}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3 py-4">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Mapa de <span className="text-primary">Financiamentos</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Pesquise organizações e descubra seus financiadores, conexões e padrões de financiamento.
        </p>
      </div>

      {/* Search */}
      <SearchInput onSearch={handleSearch} isLoading={isSearching} />

      {/* Results */}
      {lastResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Org Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold">{lastResult.organization.name}</h2>
              {lastResult.organization.description && (
                <p className="text-sm text-muted-foreground">{lastResult.organization.description}</p>
              )}
            </div>
          </div>

          {/* Connections Alert */}
          {lastResult.connections && lastResult.connections.length > 0 && (
            <ConnectionsAlert connections={lastResult.connections} />
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Tabs */}
            <Tabs defaultValue="fundings" className="space-y-4">
              <TabsList className="bg-muted/50 border border-border/50">
                <TabsTrigger value="fundings" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <DollarSign className="h-3.5 w-3.5" />
                  Financiamentos ({lastResult.fundings.length})
                </TabsTrigger>
                <TabsTrigger value="relations" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <Link2 className="h-3.5 w-3.5" />
                  Relações ({lastResult.relations.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="fundings">
                <Card className="glass-panel">
                  <CardContent className="p-0">
                    <FundingTable fundings={lastResult.fundings} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="relations">
                <Card className="glass-panel">
                  <CardContent className="pt-4">
                    <RelationsPanel relations={lastResult.relations} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Right: Mini Graph */}
            <Card className="glass-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading flex items-center gap-2">
                  <Network className="h-4 w-4 text-primary" />
                  Grafo de Relações
                </CardTitle>
                <GraphLegend />
              </CardHeader>
              <CardContent className="p-2">
                <div className="rounded-lg bg-background/50 overflow-hidden" style={{ height: 350 }}>
                  <ForceGraph
                    nodes={lastResult.graphNodes}
                    edges={lastResult.graphEdges}
                    width={500}
                    height={350}
                    onNodeClick={handleNodeClick}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!lastResult && !isSearching && (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Network className="h-8 w-8 text-primary animate-pulse-glow" />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Comece pesquisando uma organização para construir seu mapa de investigação.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
              <span>Sugestões:</span>
              {['ANTRA', 'Conectas', 'Geledés', 'ISA'].map(s => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  className="px-2 py-1 rounded-md bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
