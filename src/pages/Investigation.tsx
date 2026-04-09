import { ForceGraph } from '@/components/ForceGraph';
import { GraphLegend } from '@/components/GraphLegend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InvestigationState, GraphNode } from '@/types/funding';
import { Network, Clock, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvestigationPageProps {
  state: InvestigationState;
}

export default function InvestigationPage({ state }: InvestigationPageProps) {
  const { toast } = useToast();

  const handleNodeClick = (node: GraphNode) => {
    toast({
      title: node.label,
      description: `Tipo: ${node.type === 'organization' ? 'Organização' : node.type === 'funder' ? 'Financiador' : 'Pessoa'}`,
    });
  };

  if (state.searchHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Network className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold">Nenhuma investigação ainda</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Faça buscas na página inicial para construir seu grafo de investigação.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Minha Investigação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {state.allNodes.length} nós · {state.allEdges.length} conexões · {state.searchHistory.length} buscas
          </p>
        </div>
        <GraphLegend />
      </div>

      {/* Full Graph */}
      <Card className="glass-panel">
        <CardContent className="p-2">
          <div className="rounded-lg bg-background/50 overflow-hidden" style={{ height: 500 }}>
            <ForceGraph
              nodes={state.allNodes}
              edges={state.allEdges}
              width={900}
              height={500}
              onNodeClick={handleNodeClick}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Histórico de Buscas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {state.searchHistory.map((q) => (
                <Badge key={q} variant="secondary" className="text-xs">
                  {q}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Organizações na Rede
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-heading font-bold text-primary">
              {state.allNodes.filter(n => n.type === 'organization').length}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5" /> Financiadores Mapeados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-heading font-bold text-node-funder">
              {state.allNodes.filter(n => n.type === 'funder').length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
