"use client";

import type { RouteResult } from "@/lib/types";

// Must match SEGMENT_COLORS in Map.tsx
const SEGMENT_COLORS = ["#e11d48", "#7c3aed", "#059669", "#ea580c"];

interface JourneyCardProps {
  route: RouteResult;
}

export default function JourneyCard({ route }: JourneyCardProps) {
  const firstStop = route.segments[0]?.stops[0];
  const lastSeg = route.segments[route.segments.length - 1];
  const lastStop = lastSeg?.stops[lastSeg.stops.length - 1];

  return (
    <div className="journey-card">
      {/* Summary bar */}
      <div className="journey-summary">
        <div className="journey-stat">
          <span className="journey-stat-value">{route.totalDistance.toFixed(1)}</span>
          <span className="journey-stat-label">km</span>
        </div>
        <div className="journey-stat">
          <span className="journey-stat-value">{Math.round(route.totalTime)}</span>
          <span className="journey-stat-label">min</span>
        </div>
        <div className="journey-stat">
          <span className="journey-stat-value">
            {route.segments.length === 1 ? "Direct" : `${route.segments.length} buses`}
          </span>
          <span className="journey-stat-label">
            {route.segments.length === 1 ? "no transfer" : `${route.totalTransfers} transfer${route.totalTransfers > 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="journey-timeline">
        {/* Start point */}
        <div className="timeline-row">
          <div className="timeline-dot start" />
          <div className="timeline-content">
            <span className="timeline-stop-name">{firstStop?.name}</span>
            <span className="timeline-label">Start</span>
          </div>
        </div>

        {/* Each bus segment */}
        {route.segments.map((segment, idx) => {
          const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
          return (
            <div key={idx}>
              {/* Bus ride */}
              <div className="timeline-row">
                <div className="timeline-line" style={{ "--seg-color": color } as React.CSSProperties} />
                <div className="timeline-bus" style={{ borderColor: color, background: `${color}10` }}>
                  <span className="bus-number" style={{ color }}>Bus {segment.busNumber}</span>
                  <span className="bus-detail">
                    {segment.stops.length} stops &middot; {segment.distance.toFixed(1)} km &middot; {Math.round(segment.time)} min
                  </span>
                </div>
              </div>

              {/* Transfer */}
              {idx < route.segments.length - 1 && (
                <div className="timeline-row">
                  <div className="timeline-dot transfer" />
                  <div className="timeline-content">
                    <span className="timeline-stop-name">
                      {segment.stops[segment.stops.length - 1]?.name}
                    </span>
                    <span className="timeline-label transfer-label">
                      Transfer to Bus {route.segments[idx + 1]?.busNumber}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* End point */}
        <div className="timeline-row">
          <div className="timeline-dot end" />
          <div className="timeline-content">
            <span className="timeline-stop-name">{lastStop?.name}</span>
            <span className="timeline-label">Destination</span>
          </div>
        </div>
      </div>
    </div>
  );
}
