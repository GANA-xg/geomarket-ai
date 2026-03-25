"use client";

import { useEffect } from "react";
import L from "leaflet";
import { HeatPoint } from "@/lib/types";

type HeatLayerFactory = {
  heatLayer: (points: HeatPoint[], options?: Record<string, unknown>) => L.Layer;
};

export default function GeoMap({ heatmap }: { heatmap: HeatPoint[] }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        require("leaflet.heat");
      } catch (error) {
        console.error("Failed to load leaflet.heat", error);
      }
    }

    if (typeof window === "undefined") {
      return;
    }

    const map = L.map("map-container").setView([20.0, 0.0], 3);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: "abcd",
      maxZoom: 20
    }).addTo(map);

    const safePoints = Array.isArray(heatmap) ? heatmap.slice(0, 100) : [];
    console.log("Heatmap Data:", safePoints);
    const layerFactory = L as unknown as HeatLayerFactory;

    if (safePoints.length === 0) {
      console.debug("Geo heatmap has no points to render");
    }

    if (safePoints.length > 0 && typeof layerFactory.heatLayer === "function") {
      const heatLayer = layerFactory.heatLayer(safePoints, {
        radius: 30,
        blur: 20,
        maxZoom: 5,
        minOpacity: 0.35,
        gradient: {
          0.1: "#1e3a8a",
          0.3: "#22c55e",
          0.5: "#facc15",
          0.7: "#f97316",
          1.0: "#ef4444",
        },
      });
      heatLayer.addTo(map);

      // Add a subtle red/orange glow for critical zones while keeping heatmap-only rendering.
      const highIntensityPoints = safePoints.filter((point) => point[2] >= 0.8);
      if (highIntensityPoints.length > 0) {
        const glowLayer = layerFactory.heatLayer(highIntensityPoints, {
          radius: 45,
          blur: 28,
          maxZoom: 5,
          minOpacity: 0.2,
          gradient: {
            0.4: "#fb923c",
            1.0: "#ef4444",
          },
        });
        glowLayer.addTo(map);
      }
    } else if (safePoints.length > 0) {
      console.error("leaflet.heat did not attach heatLayer to Leaflet");
    }

    return () => {
      map.remove();
    };
  }, [heatmap]);

  return <div id="map-container" className="h-full w-full" style={{ zIndex: 10 }}></div>;
}
