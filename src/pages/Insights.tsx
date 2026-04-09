import { InvestigationState } from '@/types/funding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, Users, AlertTriangle } from 'lucide-react';

interface InsightsPageProps {
  state: InvestigationState;
}

interface Insight {
  icon: typeof TrendingUp;
  title: string;
  description: string;
  type: 'pattern' | 'cluster' | 'concentration';
}

function generateInsights(state: InvestigationState): Insight[] {
  const insights: Insight[] = [];
  if (state.allFundings.length === 0) return insights;

  // Recurring funders
  const funderCounts: Record<string, { name: string; count: number }> = {};
  state.allFundings.forEach(f => {
    if (!funderCounts[f.funderId]) funderCounts[f.funderId] = { name: f.funderName, count: 0 };
    funderCounts[f.funderId].count++;
  });

  const topFunders = Object.values(funderCounts).sort((a, b) => b.count - a.count);
  topFunders.slice(0, 3).forEach(f => {
    if (f.count >= 2) {
      insights.push({
        icon: TrendingUp,
        title: `Financiador recorrente: ${f.name}`,
        description: `Este financiador aparece em ${f.count} organizações da sua rede de investigação.`,
        type: 'pattern',
      });
    }
  });

  // Funding concentration
  const totalByFunder: Record<string, { name: string; total: number }> = {};
  state.allFundings.forEach(f => {
    if (f.amount) {
      const key = f.funderId;
      if (!totalByFunder[key]) totalByFunder[key] = { name: f.funderName, total: 0 };
      totalByFunder[key].total += f.amount;
    }
  });

  const topByAmount = Object.values(totalByFunder).sort((a, b) => b.total - a.total);
  if (topByAmount.length > 0) {
    insights.push({
      icon: AlertTriangle,
      title: 'Concentração de financiamento',
      description: `${topByAmount[0].name} é o maior financiador na sua rede, com um total estimado de ${topByAmount[0].total.toLocaleString('pt-BR')} em múltiplas moedas.`,
      type: 'concentration',
    });
  }

  // Org clusters via shared funders
  const orgsByFunder: Record<string, string[]> = {};
  state.allFundings.forEach(f => {
    const orgNode = state.allNodes.find(n => n.id === f.organizationId);
    if (orgNode) {
      if (!orgsByFunder[f.funderName]) orgsByFunder[f.funderName] = [];
      if (!orgsByFunder[f.funderName].includes(orgNode.label)) {
        orgsByFunder[f.funderName].push(orgNode.label);
      }
    }
  });

  Object.entries(orgsByFunder).forEach(([funder, orgs]) => {
    if (orgs.length >= 3) {
      insights.push({
        icon: Users,
        title: `Cluster identificado via ${funder}`,
        description: `${orgs.join(', ')} compartilham este financiador, formando um cluster na sua investigação.`,
        type: 'cluster',
      });
    }
  });

  return insights;
}

const TYPE_COLORS: Record<string, string> = {
  pattern: 'bg-primary/10 text-primary border-primary/20',
  cluster: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  concentration: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function InsightsPage({ state }: InsightsPageProps) {
  const insights = generateInsights(state);

  if (state.searchHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lightbulb className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold">Nenhum insight disponível</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Faça mais buscas para que o sistema detecte padrões automaticamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Padrões detectados automaticamente com base em {state.searchHistory.length} buscas.
        </p>
      </div>

      {insights.length === 0 ? (
        <Card className="glass-panel">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Faça mais buscas para que padrões comecem a surgir. Recomendamos pelo menos 3 organizações.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, i) => (
            <Card key={i} className="glass-panel hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <insight.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-heading">{insight.title}</CardTitle>
                    <Badge variant="outline" className={`mt-1 text-xs ${TYPE_COLORS[insight.type]}`}>
                      {insight.type === 'pattern' ? 'Padrão' : insight.type === 'cluster' ? 'Cluster' : 'Concentração'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
