export function GraphLegend() {
  const items = [
    { label: 'Organização', color: '#4f46e5', type: 'circle-lg' },
    { label: 'Financiador', color: '#eab308', type: 'circle-sm' },
    { label: 'Pessoa', color: '#22c55e', type: 'circle-xs' },
  ];

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div
            className="rounded-full"
            style={{
              width: item.type === 'circle-lg' ? 12 : item.type === 'circle-sm' ? 9 : 7,
              height: item.type === 'circle-lg' ? 12 : item.type === 'circle-sm' ? 9 : 7,
              backgroundColor: item.color,
            }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
