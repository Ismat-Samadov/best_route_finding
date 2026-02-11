"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import StopSearch from "@/components/StopSearch";
import JourneyCard from "@/components/JourneyCard";
import LocationButton from "@/components/LocationButton";
import type { StopDetail, RouteResult } from "@/lib/types";

const MapView = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [stops, setStops] = useState<StopDetail[]>([]);
  const [fromStop, setFromStop] = useState<StopDetail | null>(null);
  const [toStop, setToStop] = useState<StopDetail | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/api/stops")
      .then((r) => r.json())
      .then((data) => setStops(data.stops || []))
      .catch(() => setError("Failed to load bus stops"));
  }, []);

  const handleFindRoute = useCallback(async () => {
    if (!fromStop || !toStop) return;
    setLoading(true);
    setError(null);
    setRoute(null);

    try {
      const res = await fetch("/api/routes/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromStopId: fromStop.id, toStopId: toStop.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Route finding failed");
        return;
      }
      setRoute(data.route);
      // On mobile, auto-collapse sidebar to show the map with route
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fromStop, toStop]);

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
        setRoute(null);
      }
    },
    [fromStop, toStop]
  );

  const handleSwapStops = useCallback(() => {
    const temp = fromStop;
    setFromStop(toStop);
    setToStop(temp);
    setRoute(null);
  }, [fromStop, toStop]);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${!sidebarOpen ? "collapsed" : ""} ${searching ? "searching" : ""}`}>
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
              onSearchFocus={() => setSearching(true)}
              onSearchBlur={() => setSearching(false)}
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
              onSearchFocus={() => setSearching(true)}
              onSearchBlur={() => setSearching(false)}
            />
          </div>

          {/* Find Button */}
          <div className="form-section">
            <button
              className="primary-btn"
              onClick={handleFindRoute}
              disabled={!fromStop || !toStop || loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Finding best route...
                </>
              ) : (
                "Find Route"
              )}
            </button>
          </div>

          {/* Error */}
          {error && <div className="error-msg">{error}</div>}

          {/* Result */}
          {route && <JourneyCard route={route} />}
        </div>
      </aside>

      {/* Mobile toggle */}
      <button
        className="mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Close panel" : "Open search"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {sidebarOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </>
          )}
        </svg>
      </button>

      {/* Map */}
      <div className="map-wrapper">
        <MapView
          stops={stops}
          fromStop={fromStop}
          toStop={toStop}
          route={route}
          userLocation={userLocation}
          onStopClick={handleMapStopClick}
        />
      </div>
    </div>
  );
}
