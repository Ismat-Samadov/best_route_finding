"use client";

import RouteCard from "./RouteCard";
import type { RouteResult } from "@/lib/types";

interface RouteResultsProps {
  routes: RouteResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function RouteResults({
  routes,
  selectedIndex,
  onSelect,
}: RouteResultsProps) {
  const labels = ["Best Route", "Alternative 1", "Alternative 2"];
  const colors = ["blue", "amber", "emerald"] as const;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {routes.length} route{routes.length > 1 ? "s" : ""} found
      </h2>
      {routes.map((route, idx) => (
        <RouteCard
          key={idx}
          route={route}
          label={labels[idx] || `Route ${idx + 1}`}
          color={colors[idx % colors.length]}
          isSelected={idx === selectedIndex}
          onSelect={() => onSelect(idx)}
        />
      ))}
    </div>
  );
}
