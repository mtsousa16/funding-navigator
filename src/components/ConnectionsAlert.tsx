import { ConnectionInsight } from '@/types/funding';
import { Zap } from 'lucide-react';

interface ConnectionsAlertProps {
  connections: ConnectionInsight[];
}

export function ConnectionsAlert({ connections }: ConnectionsAlertProps) {
  if (connections.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap className="h-3 w-3 text-neon-amber" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-neon-amber">
          Conexões Detectadas
        </span>
      </div>
      {connections.map((c, i) => (
        <div
          key={i}
          className="px-3 py-2 rounded border border-neon-amber/20 bg-neon-amber/5"
        >
          <p className="font-mono text-xs text-foreground/80">{c.message}</p>
        </div>
      ))}
    </div>
  );
}
