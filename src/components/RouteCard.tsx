"use client";

import type { RouteResult } from "@/lib/types";

interface RouteCardProps {
  route: RouteResult;
  label: string;
  color: "blue" | "amber" | "emerald";
  isSelected: boolean;
  onSelect: () => void;
}

const colorStyles = {
  blue: {
    border: "border-blue-500",
    bg: "bg-blue-50",
    badge: "bg-blue-600",
    text: "text-blue-700",
    line: "bg-blue-500",
  },
  amber: {
    border: "border-amber-500",
    bg: "bg-amber-50",
    badge: "bg-amber-600",
    text: "text-amber-700",
    line: "bg-amber-500",
  },
  emerald: {
    border: "border-emerald-500",
    bg: "bg-emerald-50",
    badge: "bg-emerald-600",
    text: "text-emerald-700",
    line: "bg-emerald-500",
  },
};

export default function RouteCard({
  route,
  label,
  color,
  isSelected,
  onSelect,
}: RouteCardProps) {
  const styles = colorStyles[color];

  return (
    <div
      onClick={onSelect}
      className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
        isSelected
          ? `${styles.border} ${styles.bg} shadow-sm`
          : "border-slate-200 hover:border-slate-300 bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${styles.badge}`}
        >
          {label}
        </span>
        <div className="flex gap-3 text-xs text-slate-500">
          <span title="Distance">{route.totalDistance.toFixed(1)} km</span>
          <span title="Time">{Math.round(route.totalTime)} min</span>
          <span title="Transfers">
            {route.totalTransfers === 0
              ? "Direct"
              : `${route.totalTransfers} transfer${
                  route.totalTransfers > 1 ? "s" : ""
                }`}
          </span>
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-1.5">
        {route.segments.map((segment, idx) => (
          <div key={idx}>
            {idx > 0 && (
              <div className="flex items-center gap-2 py-1 text-xs text-slate-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                Transfer at {segment.stops[0]?.name}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span
                className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded text-white ${styles.badge}`}
              >
                {segment.busNumber}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-medium truncate">
                    {segment.stops[0]?.name}
                  </span>
                  <svg
                    className="shrink-0 text-slate-400"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14m-7-7l7 7-7 7" />
                  </svg>
                  <span className="font-medium truncate">
                    {segment.stops[segment.stops.length - 1]?.name}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {segment.stops.length} stops &middot;{" "}
                  {segment.distance.toFixed(1)} km &middot;{" "}
                  {Math.round(segment.time)} min
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
