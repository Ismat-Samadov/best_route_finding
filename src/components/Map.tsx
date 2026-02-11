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
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

const ROUTE_COLORS = ["#2563eb", "#f59e0b", "#10b981"];

interface MapViewProps {
  stops: StopDetail[];
  fromStop: StopDetail | null;
  toStop: StopDetail | null;
  routes: RouteResult[];
  selectedRouteIdx: number;
  userLocation: { lat: number; lng: number } | null;
  onStopClick: (stop: StopDetail) => void;
}

function FitBounds({
  fromStop,
  toStop,
  routes,
  selectedRouteIdx,
}: {
  fromStop: StopDetail | null;
  toStop: StopDetail | null;
  routes: RouteResult[];
  selectedRouteIdx: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (routes.length > 0 && routes[selectedRouteIdx]) {
      const route = routes[selectedRouteIdx];
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
  }, [map, fromStop, toStop, routes, selectedRouteIdx]);

  return null;
}

export default function MapView({
  stops,
  fromStop,
  toStop,
  routes,
  selectedRouteIdx,
  userLocation,
  onStopClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Create route polyline coordinates
  const routePolylines = useMemo(() => {
    return routes.map((route, idx) => {
      const coords: [number, number][] = [];
      for (const seg of route.segments) {
        for (const stop of seg.stops) {
          coords.push([stop.latitude, stop.longitude]);
        }
      }
      return {
        coords,
        color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
        isSelected: idx === selectedRouteIdx,
      };
    });
  }, [routes, selectedRouteIdx]);

  // Stop IDs used in selected route (for highlighting)
  const routeStopIds = useMemo(() => {
    const ids = new Set<number>();
    if (routes[selectedRouteIdx]) {
      for (const seg of routes[selectedRouteIdx].segments) {
        for (const stop of seg.stops) {
          ids.add(stop.id);
        }
      }
    }
    return ids;
  }, [routes, selectedRouteIdx]);

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

      <FitBounds
        fromStop={fromStop}
        toStop={toStop}
        routes={routes}
        selectedRouteIdx={selectedRouteIdx}
      />

      {/* All bus stops as circle markers */}
      {stops.map((stop) => {
        const isFrom = fromStop?.id === stop.id;
        const isTo = toStop?.id === stop.id;
        const isOnRoute = routeStopIds.has(stop.id);

        if (isFrom || isTo) return null; // Rendered separately with special icons

        return (
          <CircleMarker
            key={stop.id}
            center={[stop.latitude, stop.longitude]}
            radius={isOnRoute ? 7 : stop.is_transport_hub ? 6 : 4}
            pathOptions={{
              color: isOnRoute
                ? ROUTE_COLORS[selectedRouteIdx % ROUTE_COLORS.length]
                : stop.is_transport_hub
                ? "#f59e0b"
                : "#2563eb",
              fillColor: isOnRoute
                ? ROUTE_COLORS[selectedRouteIdx % ROUTE_COLORS.length]
                : stop.is_transport_hub
                ? "#f59e0b"
                : "#3b82f6",
              fillOpacity: isOnRoute ? 0.9 : 0.6,
              weight: isOnRoute ? 3 : 2,
            }}
            eventHandlers={{
              click: () => onStopClick(stop),
            }}
          >
            <Popup className="stop-popup">
              <div>
                <strong className="text-sm">{stop.name}</strong>
                <div className="text-xs text-gray-500 mt-1">
                  Code: {stop.code}
                </div>
                {stop.is_transport_hub && (
                  <div className="text-xs text-amber-600 mt-0.5 font-medium">
                    Transport Hub
                  </div>
                )}
                <button
                  onClick={() => onStopClick(stop)}
                  className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
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
        <Marker
          position={[fromStop.latitude, fromStop.longitude]}
          icon={StartIcon}
        >
          <Popup>
            <strong>Start: {fromStop.name}</strong>
          </Popup>
        </Marker>
      )}

      {/* To stop marker */}
      {toStop && (
        <Marker
          position={[toStop.latitude, toStop.longitude]}
          icon={EndIcon}
        >
          <Popup>
            <strong>Destination: {toStop.name}</strong>
          </Popup>
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

      {/* Route polylines */}
      {routePolylines.map((polyline, idx) => (
        <Polyline
          key={idx}
          positions={polyline.coords}
          pathOptions={{
            color: polyline.color,
            weight: polyline.isSelected ? 5 : 3,
            opacity: polyline.isSelected ? 0.9 : 0.3,
            dashArray: polyline.isSelected ? undefined : "8 8",
          }}
        />
      ))}
    </MapContainer>
  );
}
