"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { StopDetail } from "@/lib/types";

interface StopSearchProps {
  label: string;
  placeholder: string;
  stops: StopDetail[];
  selectedStop: StopDetail | null;
  onSelect: (stop: StopDetail) => void;
  markerColor: "green" | "red";
}

export default function StopSearch({
  label,
  placeholder,
  stops,
  selectedStop,
  onSelect,
  markerColor,
}: StopSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return stops
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q)
      )
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

  const colorDot =
    markerColor === "green"
      ? "bg-emerald-500"
      : "bg-red-500";

  return (
    <div className="relative">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full ${colorDot}`} />
        {label}
      </label>

      {selectedStop ? (
        <div className="mt-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
          <span className="flex-1 text-sm font-medium truncate">
            {selectedStop.name}
          </span>
          <span className="text-xs text-slate-400">{selectedStop.code}</span>
          <button
            onClick={() => {
              onSelect(null as unknown as StopDetail);
              setQuery("");
            }}
            className="text-slate-400 hover:text-slate-600 ml-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="relative mt-1">
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
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
          />
          <svg
            className="absolute right-3 top-3 text-slate-400"
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
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
            >
              {filtered.map((stop) => (
                <button
                  key={stop.id}
                  onClick={() => {
                    onSelect(stop);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                >
                  <div className="text-sm font-medium text-slate-800 truncate">
                    {stop.name}
                  </div>
                  <div className="text-xs text-slate-400">{stop.code}</div>
                </button>
              ))}
            </div>
          )}

          {isOpen && query.trim() && filtered.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm text-slate-500">
              No stops found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
