import { Funding } from '@/types/funding';
import { ExternalLink, FileText, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { MiniRadialGraph } from './MiniRadialGraph';

interface InvestigationCardProps {
  orgName: string;
  fundings: Funding[];
  onExpandNetwork?: () => void;
  index: number;
}

function formatAmount(amount?: number, currency?: string): string {
  if (!amount) return '—';
  const formatted = amount.toLocaleString('en-US');
  return `${currency || 'USD'} ${formatted}`;
}

function getTotalAmount(fundings: Funding[]): number {
  return fundings.reduce((sum, f) => sum + (f.amount || 0), 0);
}

export function InvestigationCard({ orgName, fundings, onExpandNetwork, index }: InvestigationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const total = getTotalAmount(fundings);
  const topFunders = [...new Set(fundings.map(f => f.funderName))].slice(0, 5);
  const years = [...new Set(fundings.filter(f => f.year).map(f => f.year!))].sort((a, b) => b - a);
  const displayFundings = expanded ? fundings : fundings.slice(0, 3);

  return (
    <div
      className="tactical-border tactical-border-hover bg-card/80 rounded-lg p-5 space-y-4 transition-all duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-lg font-bold text-foreground tracking-tight truncate">
            {orgName}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-xs text-muted-foreground">
              {fundings.length} registro{fundings.length !== 1 ? 's' : ''}
            </span>
            {years.length > 0 && (
              <span className="font-mono text-xs text-muted-foreground">
                {years[years.length - 1]}–{years[0]}
              </span>
            )}
          </div>
        </div>

        {/* Total amount - neon */}
        <div className="text-right shrink-0">
          <div className="font-mono text-xl font-bold neon-text text-flicker">
            {total > 0 ? formatAmount(total, 'USD') : '—'}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Total Acumulado
          </span>
        </div>
      </div>

      {/* Mini Radial Graph */}
      <div className="flex items-center gap-4">
        <MiniRadialGraph funders={topFunders} />
        <div className="flex-1 space-y-1">
          {topFunders.slice(0, 3).map((funder, i) => (
            <div key={funder} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: `hsl(${180 + i * 30}, 80%, ${55 - i * 5}%)`,
                }}
              />
              <span className="font-mono text-xs text-muted-foreground truncate">
                {funder}
              </span>
            </div>
          ))}
          {topFunders.length > 3 && (
            <span className="font-mono text-[10px] text-muted-foreground/60">
              +{topFunders.length - 3} financiadores
            </span>
          )}
        </div>
      </div>

      {/* Funding list */}
      <div className="space-y-1.5">
        {displayFundings.map(f => (
          <div
            key={f.id}
            className="flex items-center justify-between py-1.5 px-3 rounded bg-secondary/50 group"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-xs text-foreground/80 truncate">
                {f.funderName}
              </span>
              {f.year && (
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                  {f.year}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-xs neon-green-text font-medium">
                {formatAmount(f.amount, f.currency)}
              </span>
              {f.sourceUrl && (
                <a
                  href={f.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Ver fonte oficial"
                >
                  <FileText className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Expand / Collapse */}
      {fundings.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-primary transition-colors w-full justify-center py-1"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Recolher' : `Ver todos (${fundings.length})`}
        </button>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <button
          onClick={onExpandNetwork}
          className="font-mono text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
        >
          <span className="w-4 h-4 rounded-full border border-primary/50 flex items-center justify-center text-[10px]">+</span>
          Expandir Rede
        </button>

        {fundings[0]?.sourceUrl && (
          <a
            href={fundings[0].sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            📑 Fonte
          </a>
        )}
      </div>
    </div>
  );
}
