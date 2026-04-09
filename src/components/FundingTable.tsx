import { Funding } from '@/types/funding';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

interface FundingTableProps {
  fundings: Funding[];
}

function formatAmount(amount?: number, currency?: string): string {
  if (!amount) return '—';
  return `${currency || 'USD'} ${amount.toLocaleString('pt-BR')}`;
}

export function FundingTable({ fundings }: FundingTableProps) {
  if (fundings.length === 0) {
    return <p className="text-muted-foreground text-sm py-4">Nenhum financiamento encontrado.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/50">
          <TableHead className="text-muted-foreground">Financiador</TableHead>
          <TableHead className="text-muted-foreground">Valor</TableHead>
          <TableHead className="text-muted-foreground">Ano</TableHead>
          <TableHead className="text-muted-foreground">Fonte</TableHead>
          <TableHead className="text-muted-foreground">Tipo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fundings.map((f) => (
          <TableRow key={f.id} className="border-border/30 hover:bg-muted/30">
            <TableCell className="font-medium">{f.funderName}</TableCell>
            <TableCell className="font-mono text-sm">{formatAmount(f.amount, f.currency)}</TableCell>
            <TableCell>{f.year || '—'}</TableCell>
            <TableCell>
              {f.sourceUrl ? (
                <a
                  href={f.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                >
                  {f.sourceName}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-sm">{f.sourceName}</span>
              )}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={f.confidence === 'confirmed' ? 'badge-confirmed' : 'badge-inferred'}
              >
                {f.confidence === 'confirmed' ? 'Confirmado' : 'Inferido via IA'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
