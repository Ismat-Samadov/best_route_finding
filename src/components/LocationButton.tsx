"use client";

import { useState } from "react";

interface LocationButtonProps {
  onLocationFound: (lat: number, lng: number) => void;
}

export default function LocationButton({
  onLocationFound,
}: LocationButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleClick = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("success");
        onLocationFound(pos.coords.latitude, pos.coords.longitude);
        setTimeout(() => setStatus("idle"), 2000);
      },
      () => {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      onClick={handleClick}
      disabled={status === "loading"}
      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
        status === "success"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : status === "error"
          ? "bg-red-50 text-red-700 border border-red-200"
          : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
      }`}
    >
      {status === "loading" ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
          Detecting location...
        </>
      ) : status === "success" ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Location found! Nearest stop selected.
        </>
      ) : status === "error" ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          Location access denied
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          </svg>
          Use My Location
        </>
      )}
    </button>
  );
}
