interface Props {
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
}

export default function ProgressRing({ percent, size = 96, stroke = 10, label }: Props) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(100, percent)) / 100) * circ;

  const color = percent >= 80 ? "#22c55e" : percent >= 40 ? "#eab308" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1a1a22"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-semibold">{Math.round(percent)}%</div>
        {label && <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>}
      </div>
    </div>
  );
}
