"use client";

import { usePollResults } from "../api";

export function ResultsBar({ slug }: { slug: string }) {
  const { data, isLoading } = usePollResults(slug);

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.total} {data.total === 1 ? "voto" : "votos"} no total
      </p>
      <ul className="space-y-2">
        {data.options.map((opt) => (
          <li key={opt.optionId} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{opt.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {opt.count} ({opt.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${opt.percentage}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
