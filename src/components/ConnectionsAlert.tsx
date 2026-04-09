import { ConnectionInsight } from '@/types/funding';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Zap } from 'lucide-react';

interface ConnectionsAlertProps {
  connections: ConnectionInsight[];
}

export function ConnectionsAlert({ connections }: ConnectionsAlertProps) {
  if (connections.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-heading text-sm font-semibold text-primary flex items-center gap-2">
        <Zap className="h-4 w-4" />
        Conexões com sua investigação
      </h3>
      {connections.map((c, i) => (
        <Alert key={i} className="glass-panel border-primary/20 bg-primary/5">
          <AlertTitle className="text-sm font-medium">{c.type === 'shared_funder' ? 'Financiador compartilhado' : 'Padrão detectado'}</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground mt-1">
            {c.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
