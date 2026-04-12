interface MiniRadialGraphProps {
  funders: string[];
}

export function MiniRadialGraph({ funders }: MiniRadialGraphProps) {
  const size = 64;
  const center = size / 2;
  const radius = 22;
  const innerRadius = 8;

  return (
    <div className="relative radar-pulse">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid circles */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(180 100% 50% / 0.08)" strokeWidth="0.5" />
        <circle cx={center} cy={center} r={radius * 0.6} fill="none" stroke="hsl(180 100% 50% / 0.05)" strokeWidth="0.5" />

        {/* Center dot */}
        <circle cx={center} cy={center} r={innerRadius} fill="hsl(180 100% 50% / 0.15)" stroke="hsl(180 100% 50% / 0.4)" strokeWidth="1" />
        <circle cx={center} cy={center} r={3} fill="hsl(180 100% 50%)" />

        {/* Funder nodes */}
        {funders.map((_, i) => {
          const angle = (i / Math.max(funders.length, 1)) * Math.PI * 2 - Math.PI / 2;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          const hue = 180 + i * 30;

          return (
            <g key={i}>
              <line
                x1={center} y1={center}
                x2={x} y2={y}
                stroke={`hsl(${hue} 80% 50% / 0.3)`}
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />
              <circle
                cx={x} cy={y} r={4}
                fill={`hsl(${hue} 80% 55%)`}
                stroke={`hsl(${hue} 80% 55% / 0.3)`}
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
