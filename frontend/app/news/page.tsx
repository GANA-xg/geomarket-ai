"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { NewsItem } from "@/lib/types";

function sentimentClass(label: string) {
  if (label === "POSITIVE") return "bg-green-900/40 text-green-300 border border-green-800";
  if (label === "NEGATIVE") return "bg-red-900/40 text-red-300 border border-red-800";
  return "bg-gray-800 text-gray-300 border border-gray-700";
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.getNews().then((data) => {
      if (!cancelled) setItems(data as NewsItem[]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-3xl font-bold">Global News Flow & AI Sentiment</h1>

      {items.map((news) => (
        <article key={news.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold">{news.headline}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sentimentClass(news.sentiment_label)}`}>
              {news.sentiment_label}
            </span>
          </div>

          <div className="text-xs text-gray-400 flex gap-2">
            <span>{news.source || "Unknown"}</span>
            <span>•</span>
            <span>{new Date(news.published_at).toLocaleString()}</span>
            <span>•</span>
            <span>Score: {Number(news.sentiment_score || 0).toFixed(2)}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(news.affected_sectors || []).map((sector) => (
              <span key={`${news.id}-${sector}`} className="px-2 py-1 text-xs rounded bg-gray-800 border border-gray-700 text-gray-200">
                {sector}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
