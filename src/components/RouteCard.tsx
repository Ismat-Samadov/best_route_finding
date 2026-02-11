"use client";

import type { RouteResult } from "@/lib/types";

interface RouteCardProps {
  route: RouteResult;
  label: string;
  badgeColor: "blue" | "amber" | "emerald";
  cardClass: string;
  isSelected: boolean;
  onSelect: () => void;
}

export default function RouteCard({
  route,
  label,
  badgeColor,
  cardClass,
  isSelected,
  onSelect,
}: RouteCardProps) {
  return (
    <div
      className={`route-card ${cardClass} ${isSelected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <div className="route-card-header">
        <span className={`route-badge ${badgeColor}`}>{label}</span>
        <div className="route-metrics">
          <span>{route.totalDistance.toFixed(1)} km</span>
          <span>{Math.round(route.totalTime)} min</span>
          <span>
            {route.totalTransfers === 0
              ? "Direct"
              : `${route.totalTransfers} transfer${route.totalTransfers > 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {route.segments.map((segment, idx) => (
        <div key={idx}>
          {idx > 0 && (
            <div className="transfer-indicator">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Transfer at {segment.stops[0]?.name}
            </div>
          )}
          <div className="route-segment">
            <span className="bus-badge">{segment.busNumber}</span>
            <div className="segment-info">
              <div className="segment-stops">
                <span>{segment.stops[0]?.name}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M5 12h14m-7-7l7 7-7 7" />
                </svg>
                <span>{segment.stops[segment.stops.length - 1]?.name}</span>
              </div>
              <div className="segment-meta">
                {segment.stops.length} stops &middot; {segment.distance.toFixed(1)} km &middot; {Math.round(segment.time)} min
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
