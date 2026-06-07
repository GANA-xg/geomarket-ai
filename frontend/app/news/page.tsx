"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, RadioTower, Sparkles } from "lucide-react";
import { api } from "@/lib/api/client";
import { NewsItem } from "@/lib/types";
import { Badge } from "@/components/ui";
import { HoloPanel, LiveOrb, PageConstellation } from "@/components/ui/Spatial";

function sentimentClass(label: string) {
  if (label === "POSITIVE") return "bullish";
  if (label === "NEGATIVE") return "bearish";
  return "neutral";
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api.getNews()
      .then((data) => {
        if (!cancelled) setItems(data as NewsItem[]);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setItems([]);
          setError(err.message || "Failed to load news");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-5 lg:p-6">
      <PageConstellation
        eyebrow="Live event radar"
        title="Global News Flow & AI Sentiment"
        body="A spatial feed of geopolitical events, source velocity, sector impact, and sentiment direction."
      >
        <div className="flex gap-3">
          <LiveOrb label="Items" value={String(items.length)} tone="cyan" />
          <LiveOrb label="Neg" value={String(items.filter((item) => item.sentiment_label === "NEGATIVE").length)} tone="rose" />
        </div>
      </PageConstellation>

      {error ? <HoloPanel className="p-4 text-sm text-rose-200" glow="rose">{error}</HoloPanel> : null}
      {loading ? <HoloPanel className="p-8 text-center text-slate-500" glow="cyan">Listening to the live news mesh...</HoloPanel> : null}
      {!loading && items.length === 0 && !error ? <HoloPanel className="p-8 text-center text-slate-500" glow="orange">No recent news items found.</HoloPanel> : null}

      <div className="grid gap-4">
        {items.map((news, index) => (
        <HoloPanel key={news.id} className="p-5" glow={news.sentiment_label === "NEGATIVE" ? "rose" : news.sentiment_label === "POSITIVE" ? "emerald" : "cyan"}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-4">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-cyan-200 sm:flex">
                {index % 2 === 0 ? <RadioTower size={19} /> : <BrainCircuit size={19} />}
              </div>
              <h2 className="text-xl font-semibold leading-snug text-white">{news.headline}</h2>
            </div>
            <Badge variant={sentimentClass(news.sentiment_label) as any}>{news.sentiment_label}</Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>{news.source || "Unknown"}</span>
            <span>•</span>
            <span>{new Date(news.published_at).toLocaleString()}</span>
            <span>•</span>
            <span>Score: {Number(news.sentiment_score || 0).toFixed(2)}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(news.affected_sectors || []).map((sector) => (
              <span key={`${news.id}-${sector}`} className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
                <Sparkles size={11} className="text-orange-200" />
                {sector}
              </span>
            ))}
          </div>
        </HoloPanel>
        ))}
      </div>
    </div>
  );
}
