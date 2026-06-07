"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { api } from "@/lib/api/client";
import { HeatPoint } from "@/lib/types";
import { HoloPanel, LiveOrb, PageConstellation } from "@/components/ui/Spatial";

const MapWithNoSSR = dynamic(() => import("../../components/GeoMap"), { ssr: false });

export default function MapPage() {
  const [heatmap, setHeatmap] = useState<HeatPoint[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const hasSignals = heatmap.length > 0;

  useEffect(() => {
    let cancelled = false;

    const loadHeatmap = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api.getGeoHeatmap();
        const points = Array.isArray(data?.heatmap) ? data.heatmap : [];

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
          setError("Failed to load geo heatmap data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadHeatmap();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 p-5 lg:p-6">
      <PageConstellation
        eyebrow="3D geo intelligence"
        title="Live Geopolitical Impact"
        body="A global heat layer for AI-extracted events, sector pressure, and regional market risk."
      >
        <div className="flex gap-3">
          <LiveOrb label="Zones" value={String(heatmap.length)} tone="orange" />
          <LiveOrb label="Live" value={loading ? "..." : "On"} tone={error ? "rose" : "emerald"} />
        </div>
      </PageConstellation>

      <HoloPanel className="relative h-[74vh] min-h-[560px] overflow-hidden p-0" glow="orange">
        <div className="absolute left-4 top-4 z-[400] max-w-sm rounded-2xl border border-white/[0.10] bg-[#061018]/86 p-4 shadow-xl backdrop-blur-xl">
          <h2 className="text-lg font-bold text-slate-100">Thermal event map</h2>
          <p className="text-sm text-slate-300">Heat intensity is generated from the latest geopolitical signal feed.</p>
        </div>
        {loading ? (
          <div className="absolute inset-x-0 top-24 z-[400] mx-auto w-fit rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
            Loading global heat layer...
          </div>
        ) : null}
        {!loading && !hasSignals ? (
          <div className="absolute inset-x-0 top-24 z-[400] mx-auto w-fit rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            {error || "No geopolitical signals detected"}
          </div>
        ) : null}
        <MapWithNoSSR heatmap={heatmap} />
      </HoloPanel>
    </div>
  );
}
