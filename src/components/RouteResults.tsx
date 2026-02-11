"use client";

import RouteCard from "./RouteCard";
import type { RouteResult } from "@/lib/types";

interface RouteResultsProps {
  routes: RouteResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function RouteResults({ routes, selectedIndex, onSelect }: RouteResultsProps) {
  const labels = ["Best Route", "Alternative 1", "Alternative 2"];
  const badges = ["blue", "amber", "emerald"] as const;
  const cardClasses = ["", "alt-1", "alt-2"];

  return (
    <div>
      <div className="form-label" style={{ marginTop: 8 }}>
        {routes.length} route{routes.length > 1 ? "s" : ""} found
      </div>
      {routes.map((route, idx) => (
        <RouteCard
          key={idx}
          route={route}
          label={labels[idx] || `Route ${idx + 1}`}
          badgeColor={badges[idx % badges.length]}
          cardClass={cardClasses[idx] || ""}
          isSelected={idx === selectedIndex}
          onSelect={() => onSelect(idx)}
        />
      ))}
    </div>
  );
}
