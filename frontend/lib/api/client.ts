const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  getDashboardStats: () => request("/api/dashboard/stats"),
  getLatestSignals: () => request("/api/signals/latest"),
  getStocks: (params?: { sector?: string; signal?: string; buffett?: boolean }) => {
    const search = new URLSearchParams();
    if (params?.sector) search.set("sector", params.sector);
    if (params?.signal) search.set("signal", params.signal);
    if (typeof params?.buffett === "boolean") search.set("buffett", String(params.buffett));
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return request(`/api/stocks${suffix}`);
  },
  getNews: () => request("/api/news/latest"),
  getGeoMarkers: () => request("/api/geo-markers"),
  getGeoHeatmap: () => request<{ heatmap: number[][] }>("/api/geo-heatmap"),
  getPortfolio: () => request("/api/portfolio/summary"),
  createPosition: (body: { ticker: string; quantity: number; entry_price: number; entry_date?: string }) =>
    fetch(`${API_BASE}/api/portfolio/positions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create position");
      }
      return res.json();
    }),
  updatePosition: (portfolioId: number, body: { quantity: number; entry_price: number; entry_date?: string }) =>
    fetch(`${API_BASE}/api/portfolio/positions/${portfolioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update position");
      }
      return res.json();
    }),
  deletePosition: (portfolioId: number) =>
    fetch(`${API_BASE}/api/portfolio/positions/${portfolioId}`, {
      method: "DELETE",
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete position");
      }
      return res.json();
    }),
};
