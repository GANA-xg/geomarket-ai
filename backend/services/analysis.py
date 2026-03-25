import asyncio
from statistics import mean
from typing import Any

from services.ai_processor import ai_processor

SECTOR_TO_INDIAN_STOCKS = {
    "ENERGY": ["RELIANCE.NS", "ONGC.NS", "IOC.NS"],
    "IT": ["TCS.NS", "INFY.NS", "HCLTECH.NS"],
    "BANKING": ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS"],
    "FMCG": ["HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS"],
    "AUTO": ["MARUTI.NS", "TATAMOTORS.NS", "M&M.NS"],
    "PHARMA": ["SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS"],
    "METALS": ["TATASTEEL.NS", "HINDALCO.NS", "JSWSTEEL.NS"],
    "INFRA": ["LT.NS", "ADANIENT.NS", "NTPC.NS"],
    "DEFENCE": ["HAL.NS", "BEL.NS", "BDL.NS"],
    "PAINT": ["ASIANPAINT.NS", "BERGEPAINT.NS"],
    "TELECOM": ["BHARTIARTL.NS", "IDEA.NS"],
    "REALTY": ["DLF.NS", "GODREJPROP.NS"],
    "AVIATION": ["INDIGO.NS", "SPICEJET.NS"],
}


class MarketAnalysisService:
    @staticmethod
    def _score_to_signal(score: float) -> str:
        if score > 0.2:
            return "BUY"
        if score < -0.2:
            return "SELL"
        return "HOLD"

    @staticmethod
    def _extract_news_text(article: dict[str, Any]) -> tuple[str, str]:
        headline = article.get("headline") or article.get("title") or ""
        body = article.get("raw_text") or article.get("description") or ""
        return str(headline), str(body)

    async def _analyze_articles(self, news_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        limited_news = news_items[:5]
        tasks = []
        for item in limited_news:
            headline, body = self._extract_news_text(item)
            tasks.append(asyncio.to_thread(ai_processor.process_article, headline, body))

        if not tasks:
            return []

        raw_results = await asyncio.gather(*tasks, return_exceptions=True)
        results: list[dict[str, Any]] = []
        for raw in raw_results:
            if isinstance(raw, Exception):
                continue
            if isinstance(raw, dict):
                results.append(raw)
        return results

    async def generate_signal(
        self,
        symbol: str,
        price_data: dict[str, Any],
        fundamentals: dict[str, Any],
        news_items: list[dict[str, Any]],
    ) -> dict[str, Any]:
        ai_results = await self._analyze_articles(news_items)

        sentiment_values = [float(item.get("combined_sentiment_score", 0.0)) for item in ai_results]
        news_sentiment = mean(sentiment_values) if sentiment_values else 0.0

        sectors: list[str] = []
        for item in ai_results:
            llm = item.get("llm", {}) or {}
            for sector in llm.get("affected_sectors", []) or []:
                sector_name = str(sector).strip().upper()
                if sector_name and sector_name not in sectors:
                    sectors.append(sector_name)

        related_stocks = [symbol]
        for sector in sectors[:3]:
            for ticker in SECTOR_TO_INDIAN_STOCKS.get(sector, []):
                if ticker not in related_stocks:
                    related_stocks.append(ticker)

        pe = fundamentals.get("pe")
        pb = fundamentals.get("pb")
        beta = fundamentals.get("beta")

        score = news_sentiment * 0.55
        if isinstance(pe, (int, float)):
            if pe < 18:
                score += 0.15
            elif pe > 35:
                score -= 0.15

        if isinstance(pb, (int, float)):
            if pb < 3:
                score += 0.1
            elif pb > 7:
                score -= 0.1

        if isinstance(beta, (int, float)) and beta > 1.5 and news_sentiment < 0:
            score -= 0.05

        signal = self._score_to_signal(score)
        confidence = min(0.95, 0.4 + (abs(score) * 0.6) + min(len(news_items), 5) * 0.03)

        reasoning_parts = [f"News sentiment score={news_sentiment:.2f}"]
        if sectors:
            reasoning_parts.append(f"Impacted sectors: {', '.join(sectors[:3])}")
        if isinstance(pe, (int, float)):
            reasoning_parts.append(f"PE={pe:.2f}")
        if isinstance(pb, (int, float)):
            reasoning_parts.append(f"PB={pb:.2f}")
        if isinstance(beta, (int, float)):
            reasoning_parts.append(f"Beta={beta:.2f}")

        return {
            "stock": symbol,
            "signal": signal,
            "confidence": round(confidence, 3),
            "reasoning": " | ".join(reasoning_parts),
            "price": price_data.get("price"),
            "pe": pe,
            "pb": pb,
            "beta": beta,
            "related_stocks": related_stocks[:5],
        }


market_analysis_service = MarketAnalysisService()
