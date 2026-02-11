"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { StopDetail } from "@/lib/types";

interface StopSearchProps {
  label: string;
  placeholder: string;
  stops: StopDetail[];
  selectedStop: StopDetail | null;
  onSelect: (stop: StopDetail | null) => void;
  dotColor: "green" | "red";
}

export default function StopSearch({
  label,
  placeholder,
  stops,
  selectedStop,
  onSelect,
  dotColor,
}: StopSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return stops
      .filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      .slice(0, 20);
  }, [query, stops]);

  // Close dropdown when tapping outside
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  const handleSelect = useCallback(
    (stop: StopDetail) => {
      onSelect(stop);
      setQuery("");
      setIsOpen(false);
    },
    [onSelect]
  );

  return (
    <div ref={containerRef}>
      <div className="form-label">
        <span className={`dot ${dotColor}`} />
        {label}
      </div>

      {selectedStop ? (
        <div className="selected-stop">
          <span className="stop-name">{selectedStop.name}</span>
          <span className="stop-code">{selectedStop.code}</span>
          <button
            className="clear-btn"
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="search-input"
          />

          {isOpen && filtered.length > 0 && (
            <div className="dropdown-inline">
              {filtered.map((stop) => (
                <button
                  key={stop.id}
                  className="dropdown-item"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur/focus loss
                    handleSelect(stop);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault(); // Prevent ghost click
                    handleSelect(stop);
                  }}
                >
                  <div className="name">{stop.name}</div>
                  <div className="code">{stop.code}</div>
                </button>
              ))}
            </div>
          )}

          {isOpen && query.trim() && filtered.length === 0 && (
            <div className="dropdown-inline" style={{ padding: 14, fontSize: 13, color: "#64748b" }}>
              No stops found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
