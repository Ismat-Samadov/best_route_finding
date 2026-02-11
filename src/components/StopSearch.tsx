"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return stops
      .filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      .slice(0, 30);
  }, [query, stops]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div>
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
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
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
          <svg
            style={{ position: "absolute", right: 14, top: 14, color: "#94a3b8" }}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>

          {isOpen && filtered.length > 0 && (
            <div ref={dropdownRef} className="dropdown">
              {filtered.map((stop) => (
                <button
                  key={stop.id}
                  className="dropdown-item"
                  onClick={() => {
                    onSelect(stop);
                    setQuery("");
                    setIsOpen(false);
                  }}
                >
                  <div className="name">{stop.name}</div>
                  <div className="code">{stop.code}</div>
                </button>
              ))}
            </div>
          )}

          {isOpen && query.trim() && filtered.length === 0 && (
            <div className="dropdown" style={{ padding: 14, fontSize: 13, color: "#64748b" }}>
              No stops found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
