import { Relation } from '@/types/funding';
import { Badge } from '@/components/ui/badge';
import { Link2, Users } from 'lucide-react';
import { getOrganizationById } from '@/data/mockData';

interface RelationsPanelProps {
  relations: Relation[];
}

const RELATION_ICONS: Record<string, typeof Link2> = {
  shared_funder: Link2,
  co_occurrence: Users,
  partnership: Users,
  shared_leader: Users,
};

export function RelationsPanel({ relations }: RelationsPanelProps) {
  if (relations.length === 0) {
    return <p className="text-muted-foreground text-sm py-4">Nenhuma relação identificada.</p>;
  }

  return (
    <div className="space-y-3">
      {relations.map((r) => {
        const Icon = RELATION_ICONS[r.type] || Link2;
        const target = getOrganizationById(r.targetId);
        return (
          <div key={r.id} className="glass-panel p-3 flex items-start gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{target?.name || r.targetId}</span>
                <Badge
                  variant="outline"
                  className={r.confidence === 'confirmed' ? 'badge-confirmed' : 'badge-inferred'}
                >
                  {r.confidence === 'confirmed' ? 'Confirmado' : 'Inferido'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{r.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
