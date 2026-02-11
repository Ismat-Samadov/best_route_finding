"use client";

import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import type { StopDetail, RouteResult } from "@/lib/types";

// Baku center coordinates
const BAKU_CENTER: [number, number] = [40.4093, 49.8671];
const DEFAULT_ZOOM = 12;

// Fix Leaflet default icon issue in Next.js
const StartIcon = L.divIcon({
  className: "custom-stop-marker selected-start",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const EndIcon = L.divIcon({
  className: "custom-stop-marker selected-end",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const ROUTE_COLOR = "#2563eb";

interface MapViewProps {
  stops: StopDetail[];
  fromStop: StopDetail | null;
  toStop: StopDetail | null;
  route: RouteResult | null;
  userLocation: { lat: number; lng: number } | null;
  onStopClick: (stop: StopDetail) => void;
}

function FitBounds({
  fromStop,
  toStop,
  route,
}: {
  fromStop: StopDetail | null;
  toStop: StopDetail | null;
  route: RouteResult | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (route) {
      const allCoords: [number, number][] = [];
      for (const seg of route.segments) {
        for (const stop of seg.stops) {
          allCoords.push([stop.latitude, stop.longitude]);
        }
      }
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else if (fromStop && toStop) {
      const bounds = L.latLngBounds([
        [fromStop.latitude, fromStop.longitude],
        [toStop.latitude, toStop.longitude],
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (fromStop) {
      map.setView([fromStop.latitude, fromStop.longitude], 15);
    }
  }, [map, fromStop, toStop, route]);

  return null;
}

export default function MapView({
  stops,
  fromStop,
  toStop,
  route,
  userLocation,
  onStopClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Create route polyline coordinates
  const routePolyline = useMemo(() => {
    if (!route) return null;
    const coords: [number, number][] = [];
    for (const seg of route.segments) {
      for (const stop of seg.stops) {
        coords.push([stop.latitude, stop.longitude]);
      }
    }
    return coords;
  }, [route]);

  // Stop IDs used in route (for highlighting)
  const routeStopIds = useMemo(() => {
    const ids = new Set<number>();
    if (route) {
      for (const seg of route.segments) {
        for (const stop of seg.stops) {
          ids.add(stop.id);
        }
      }
    }
    return ids;
  }, [route]);

  return (
    <MapContainer
      center={BAKU_CENTER}
      zoom={DEFAULT_ZOOM}
      className="w-full h-full"
      ref={mapRef}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds fromStop={fromStop} toStop={toStop} route={route} />

      {/* All bus stops as circle markers */}
      {stops.map((stop) => {
        const isFrom = fromStop?.id === stop.id;
        const isTo = toStop?.id === stop.id;
        const isOnRoute = routeStopIds.has(stop.id);

        if (isFrom || isTo) return null;

        return (
          <CircleMarker
            key={stop.id}
            center={[stop.latitude, stop.longitude]}
            radius={isOnRoute ? 7 : stop.is_transport_hub ? 6 : 4}
            pathOptions={{
              color: isOnRoute ? ROUTE_COLOR : stop.is_transport_hub ? "#f59e0b" : "#2563eb",
              fillColor: isOnRoute ? ROUTE_COLOR : stop.is_transport_hub ? "#f59e0b" : "#3b82f6",
              fillOpacity: isOnRoute ? 0.9 : 0.6,
              weight: isOnRoute ? 3 : 2,
            }}
            eventHandlers={{
              click: () => onStopClick(stop),
            }}
          >
            <Popup className="stop-popup">
              <div>
                <strong style={{ fontSize: 13 }}>{stop.name}</strong>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Code: {stop.code}
                </div>
                {stop.is_transport_hub && (
                  <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2, fontWeight: 500 }}>
                    Transport Hub
                  </div>
                )}
                <button
                  onClick={() => onStopClick(stop)}
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    background: "#2563eb",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Select Stop
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* From stop marker */}
      {fromStop && (
        <Marker position={[fromStop.latitude, fromStop.longitude]} icon={StartIcon}>
          <Popup><strong>Start: {fromStop.name}</strong></Popup>
        </Marker>
      )}

      {/* To stop marker */}
      {toStop && (
        <Marker position={[toStop.latitude, toStop.longitude]} icon={EndIcon}>
          <Popup><strong>Destination: {toStop.name}</strong></Popup>
        </Marker>
      )}

      {/* User location */}
      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={10}
          pathOptions={{
            color: "#4f46e5",
            fillColor: "#6366f1",
            fillOpacity: 0.8,
            weight: 3,
          }}
        >
          <Popup>Your location</Popup>
        </CircleMarker>
      )}

      {/* Route polyline */}
      {routePolyline && (
        <Polyline
          positions={routePolyline}
          pathOptions={{
            color: ROUTE_COLOR,
            weight: 5,
            opacity: 0.85,
          }}
        />
      )}
    </MapContainer>
  );
}
