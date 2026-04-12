interface TopicFiltersProps {
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

const FILTERS = [
  { id: 'climate', label: '🌳 Clima', keywords: ['climate', 'environment', 'sustain', 'green', 'ecology', 'forest'] },
  { id: 'gender', label: '♀️ Gênero', keywords: ['gender', 'women', 'feminist', 'lgbtq', 'sexual', 'reproductive'] },
  { id: 'institutional', label: '🏛️ Institucional', keywords: ['governance', 'democracy', 'rights', 'justice', 'policy', 'civic', 'institutional'] },
];

export { FILTERS };

export function TopicFilters({ activeFilter, onFilterChange }: TopicFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mr-1">
        Pauta:
      </span>
      {FILTERS.map(f => (
        <button
          key={f.id}
          onClick={() => onFilterChange(activeFilter === f.id ? null : f.id)}
          className={`
            font-mono text-xs px-3 py-1.5 rounded border transition-all duration-200
            ${activeFilter === f.id
              ? 'border-primary/50 bg-primary/10 text-primary glow-cyan'
              : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
            }
          `}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
