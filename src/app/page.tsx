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

  // Fetch all stops on mount
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
        body: JSON.stringify({
          fromStopId: fromStop.id,
          toStopId: toStop.id,
          mode,
        }),
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
      // Find nearest stop and set as start
      if (stops.length > 0) {
        let nearest = stops[0];
        let minDist = Infinity;
        for (const stop of stops) {
          const d = Math.sqrt(
            Math.pow(stop.latitude - lat, 2) +
              Math.pow(stop.longitude - lng, 2)
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
        // Reset and set new start
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

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-full md:w-[400px]" : "w-0"
        } transition-all duration-300 bg-white border-r border-slate-200 flex flex-col z-10 shadow-lg md:shadow-none ${
          sidebarOpen ? "max-h-[50vh] md:max-h-full" : "max-h-0 md:max-h-full"
        } overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shrink-0">
          <h1 className="text-lg font-bold">Baku Bus Route Planner</h1>
          <p className="text-blue-100 text-xs mt-0.5">
            Find the best bus routes across Baku
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Location Button */}
          <LocationButton onLocationFound={handleLocationFound} />

          {/* Stop Selection */}
          <div className="space-y-3">
            <StopSearch
              label="From"
              placeholder="Select start stop..."
              stops={stops}
              selectedStop={fromStop}
              onSelect={setFromStop}
              markerColor="green"
            />

            {/* Swap button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwapStops}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                title="Swap stops"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-slate-500"
                >
                  <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            <StopSearch
              label="To"
              placeholder="Select destination stop..."
              stops={stops}
              selectedStop={toStop}
              onSelect={setToStop}
              markerColor="red"
            />
          </div>

          {/* Mode Selection */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Optimization
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {(
                [
                  { value: "balanced", label: "Balanced", icon: "⚖️" },
                  { value: "shortest", label: "Shortest", icon: "📏" },
                  { value: "fastest", label: "Fastest", icon: "⚡" },
                ] as const
              ).map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    mode === value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span className="block text-sm">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Find Routes Button */}
          <button
            onClick={handleFindRoutes}
            disabled={!fromStop || !toStop || loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-colors shadow-sm disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Computing routes...
              </span>
            ) : (
              "Find Routes"
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Route Results */}
          {routes.length > 0 && (
            <RouteResults
              routes={routes}
              selectedIndex={selectedRouteIdx}
              onSelect={setSelectedRouteIdx}
            />
          )}
        </div>
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed bottom-4 left-4 z-20 bg-blue-600 text-white p-3 rounded-full shadow-lg"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {sidebarOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M3 12h18M3 6h18M3 18h18" />
          )}
        </svg>
      </button>

      {/* Map */}
      <div className="flex-1 relative">
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
