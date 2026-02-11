"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import StopSearch from "@/components/StopSearch";
import RouteResults from "@/components/RouteResults";
import LocationButton from "@/components/LocationButton";
import type { StopDetail, RouteResult, OptimizationMode } from "@/lib/types";

const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [stops, setStops] = useState<StopDetail[]>([]);
  const [fromStop, setFromStop] = useState<StopDetail | null>(null);
  const [toStop, setToStop] = useState<StopDetail | null>(null);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [mode, setMode] = useState<OptimizationMode>("balanced");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch("/api/stops")
      .then((r) => r.json())
      .then((data) => setStops(data.stops || []))
      .catch(() => setError("Failed to load bus stops"));
  }, []);

  const handleFindRoutes = useCallback(async () => {
    if (!fromStop || !toStop) return;
    setLoading(true);
    setError(null);
    setRoutes([]);
    setSelectedRouteIdx(0);

    try {
      const res = await fetch("/api/routes/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromStopId: fromStop.id, toStopId: toStop.id, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Route finding failed");
        return;
      }
      setRoutes(data.routes);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fromStop, toStop, mode]);

  const handleLocationFound = useCallback(
    (lat: number, lng: number) => {
      setUserLocation({ lat, lng });
      if (stops.length > 0) {
        let nearest = stops[0];
        let minDist = Infinity;
        for (const stop of stops) {
          const d = Math.sqrt(
            Math.pow(stop.latitude - lat, 2) + Math.pow(stop.longitude - lng, 2)
          );
          if (d < minDist) {
            minDist = d;
            nearest = stop;
          }
        }
        setFromStop(nearest);
      }
    },
    [stops]
  );

  const handleMapStopClick = useCallback(
    (stop: StopDetail) => {
      if (!fromStop) {
        setFromStop(stop);
      } else if (!toStop) {
        setToStop(stop);
      } else {
        setFromStop(stop);
        setToStop(null);
        setRoutes([]);
      }
    },
    [fromStop, toStop]
  );

  const handleSwapStops = useCallback(() => {
    const temp = fromStop;
    setFromStop(toStop);
    setToStop(temp);
    setRoutes([]);
  }, [fromStop, toStop]);

  const modes: Array<{ value: OptimizationMode; label: string; icon: string }> = [
    { value: "balanced", label: "Balanced", icon: "⚖️" },
    { value: "shortest", label: "Shortest", icon: "📏" },
    { value: "fastest", label: "Fastest", icon: "⚡" },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${!sidebarOpen ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <h1>Baku Bus Route Planner</h1>
          <p>Find the best bus routes across Baku</p>
        </div>

        <div className="sidebar-body">
          {/* Location */}
          <div className="form-section">
            <LocationButton onLocationFound={handleLocationFound} />
          </div>

          {/* From */}
          <div className="form-section">
            <StopSearch
              label="From"
              placeholder="Search start stop..."
              stops={stops}
              selectedStop={fromStop}
              onSelect={setFromStop}
              dotColor="green"
            />
          </div>

          {/* Swap */}
          <div className="form-section" style={{ textAlign: "center" }}>
            <button className="swap-btn" onClick={handleSwapStops} title="Swap stops">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To */}
          <div className="form-section">
            <StopSearch
              label="To"
              placeholder="Search destination stop..."
              stops={stops}
              selectedStop={toStop}
              onSelect={setToStop}
              dotColor="red"
            />
          </div>

          {/* Mode */}
          <div className="form-section">
            <div className="form-label">Optimization Mode</div>
            <div className="mode-grid">
              {modes.map(({ value, label, icon }) => (
                <button
                  key={value}
                  className={`mode-btn ${mode === value ? "active" : ""}`}
                  onClick={() => setMode(value)}
                >
                  <span className="icon">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Find Button */}
          <div className="form-section">
            <button
              className="primary-btn"
              onClick={handleFindRoutes}
              disabled={!fromStop || !toStop || loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Computing routes...
                </>
              ) : (
                "Find Routes"
              )}
            </button>
          </div>

          {/* Error */}
          {error && <div className="error-msg">{error}</div>}

          {/* Results */}
          {routes.length > 0 && (
            <RouteResults
              routes={routes}
              selectedIndex={selectedRouteIdx}
              onSelect={setSelectedRouteIdx}
            />
          )}
        </div>
      </aside>

      {/* Mobile toggle */}
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {sidebarOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M3 12h18M3 6h18M3 18h18" />
          )}
        </svg>
      </button>

      {/* Map */}
      <div className="map-wrapper">
        <MapView
          stops={stops}
          fromStop={fromStop}
          toStop={toStop}
          routes={routes}
          selectedRouteIdx={selectedRouteIdx}
          userLocation={userLocation}
          onStopClick={handleMapStopClick}
        />
      </div>
    </div>
  );
}
