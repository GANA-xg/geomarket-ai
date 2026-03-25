"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { api } from "@/lib/api/client";
import { HeatPoint } from "@/lib/types";

const MapWithNoSSR = dynamic(() => import("../../components/GeoMap"), { ssr: false });

export default function MapPage() {
  const [heatmap, setHeatmap] = useState<HeatPoint[]>([]);
  const hasSignals = heatmap.length > 0;

  useEffect(() => {
    let cancelled = false;

    const loadHeatmap = async () => {
      try {
        const data = await api.getGeoHeatmap();
        const points = Array.isArray(data?.heatmap) ? data.heatmap : [];
        console.log("Heatmap Data:", points);

        if (!Array.isArray(data?.heatmap)) {
          console.warn("Geo heatmap API returned invalid payload shape", data);
        }

        if (!cancelled) {
          setHeatmap(points as HeatPoint[]);
        }
      } catch (error) {
        console.error("Failed to load geo heatmap data", error);
        if (!cancelled) {
          setHeatmap([]);
        }
      }
    };

    loadHeatmap();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-[80vh] w-full border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative bg-gradient-to-br from-slate-950 via-slate-900 to-black animate-[fadeIn_600ms_ease-out]">
      <div className="absolute top-4 left-4 z-[400] bg-slate-900/85 backdrop-blur-md p-4 rounded-lg border border-slate-700 shadow-xl">
        <h2 className="text-lg font-bold text-slate-100">Live Geopolitical Impact</h2>
        <p className="text-sm text-slate-300">Thermal hotspots based on AI-extracted global events</p>
      </div>
      {!hasSignals ? (
        <div className="absolute inset-x-0 top-20 z-[400] mx-auto w-fit rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          No geopolitical signals detected
        </div>
      ) : null}
      <MapWithNoSSR heatmap={heatmap} />
    </div>
  );
}
