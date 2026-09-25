"use client";

export function AgentNetwork() {
  return (
    <svg viewBox="0 0 640 420" className="h-full w-full" role="img" aria-label="Animated multi-agent workflow: form trigger to research, qualify, approve, and dispatch">
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
      </defs>
      <path className="flow-dash" d="M80 210 C 170 80, 250 80, 320 210 C 390 340, 470 340, 560 210" fill="none" stroke="url(#g)" strokeWidth="1.6" opacity="0.9" />
      <path className="flow-dash" d="M80 210 C 170 340, 250 340, 320 210 C 390 80, 470 80, 560 210" fill="none" stroke="#3b82f6" strokeWidth="1.2" opacity="0.45" />
      {[
        [80, 210, "Trigger"],
        [200, 118, "Sales"],
        [200, 302, "Support"],
        [320, 210, "Chief"],
        [440, 118, "Finance"],
        [440, 302, "Ops"],
        [560, 210, "Approve"],
      ].map(([x, y, label]) => (
        <g key={String(label)} transform={`translate(${x},${y})`}>
          <circle r="28" fill="#0b1220" stroke="url(#g)" strokeWidth="1.4" />
          <circle r="6" fill="#5eead4" className="origin-center" style={{ animation: "pulse-node 3.2s ease-in-out infinite" }} />
          <text y="48" textAnchor="middle" fill="currentColor" fontSize="11" fontFamily="ui-monospace, monospace">
            {String(label)}
          </text>
        </g>
      ))}
    </svg>
  );
}
