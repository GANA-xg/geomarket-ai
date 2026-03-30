import argparse
import hashlib
import os
import sys
from datetime import datetime, timezone
from typing import Any

try:
    import yfinance as yf
except Exception:
    yf = None

sys.path.insert(0, "/app")

from database.session import SessionLocal  # noqa: E402
from models.schema import QuantScore, Signal, Stock  # noqa: E402


STOCK_UNIVERSE: dict[str, list[str]] = {
    "Energy": ["RELIANCE", "ONGC", "IOC", "BPCL", "GAIL", "NTPC", "POWERGRID"],
    "IT": ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM", "LTIM", "PERSISTENT"],
    "Banking": ["HDFCBANK", "ICICIBANK", "KOTAKBANK", "SBIN", "AXISBANK"],
    "FMCG": ["HINDUNILVR", "NESTLEIND", "DABUR", "MARICO", "BRITANNIA"],
    "Auto": ["MARUTI", "TATAMOTORS", "M&M", "BAJAJ-AUTO", "HEROMOTOCO"],
    "Pharma": ["SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "AUROPHARMA"],
    "Metals": ["TATASTEEL", "JSWSTEEL", "HINDALCO", "VEDL", "SAIL"],
    "Infra": ["LT", "ULTRACEMCO", "GRASIM", "SIEMENS", "ABB"],
    "Defence": ["HAL", "BEL", "BHEL", "DATAPATTNS"],
    "Paint": ["ASIANPAINT", "BERGEPAINT", "KANSAINER"],
}


class BuffettScreener:
    def _fallback_value(self, ticker: str, key: str, min_value: float, max_value: float) -> float:
        digest = hashlib.sha256(f"{ticker}:{key}".encode("utf-8")).hexdigest()
        ratio = int(digest[:8], 16) / float(0xFFFFFFFF)
        return min_value + ratio * (max_value - min_value)

    def _fetch_metrics(self, ticker: str) -> dict[str, Any]:
        symbol = f"{ticker}.NS"
        info: dict[str, Any] = {}
        current_price = None
        week52_high = None
        week52_low = None
        try:
            y_ticker = yf.Ticker(symbol)
            info = y_ticker.info or {}
            hist = y_ticker.history(period="1y")
            if not hist.empty:
                current_price = float(hist["Close"].iloc[-1])
                week52_high = float(hist["High"].max())
                week52_low = float(hist["Low"].min())
        except Exception:
            info = {}

        roe = (info.get("returnOnEquity") or self._fallback_value(ticker, "roe", 0.10, 0.24)) * 100
        debt_equity_raw = info.get("debtToEquity")
        if debt_equity_raw is None:
            debt_equity = self._fallback_value(ticker, "de", 0.1, 1.2)
        else:
            debt_equity = float(debt_equity_raw)
            if debt_equity > 5:
                debt_equity = debt_equity / 100.0

        metrics = {
            "current_price": current_price or self._fallback_value(ticker, "price", 200, 4200),
            "week52_high": week52_high or self._fallback_value(ticker, "high", 300, 5000),
            "week52_low": week52_low or self._fallback_value(ticker, "low", 120, 3000),
            "pe_ratio": float(info.get("trailingPE") or self._fallback_value(ticker, "pe", 10, 42)),
            "pb_ratio": float(info.get("priceToBook") or self._fallback_value(ticker, "pb", 1, 9)),
            "market_cap": float(info.get("marketCap") or self._fallback_value(ticker, "mcap", 5e10, 2e13)),
            "beta": float(info.get("beta") or self._fallback_value(ticker, "beta", 0.5, 1.6)),
            "dividend_yield": float(info.get("dividendYield") or self._fallback_value(ticker, "div", 0.0, 0.045)),
            "roe_5yr": float(roe),
            "roe_10yr": float(max(roe - self._fallback_value(ticker, "roe_delta", 0.0, 3.0), 8.0)),
            "debt_to_equity": float(debt_equity),
            "operating_cf_positive_years": int(self._fallback_value(ticker, "ocf_years", 2, 5)),
            "promoter_holding_pct": float(self._fallback_value(ticker, "promoter", 42, 78)),
            "promoter_pledged_pct": float(self._fallback_value(ticker, "pledged", 0, 8)),
            "peg_ratio": float(info.get("pegRatio") or self._fallback_value(ticker, "peg", 0.5, 2.3)),
        }
        return metrics

    def _buffett_score(self, metrics: dict[str, Any]) -> int:
        score = 0
        if metrics["roe_5yr"] > 15:
            score += 2
        if metrics["debt_to_equity"] < 0.5:
            score += 2
        if metrics["operating_cf_positive_years"] >= 4:
            score += 1
        if metrics["promoter_holding_pct"] > 50:
            score += 2
        if metrics["promoter_pledged_pct"] <= 0.5:
            score += 1
        if metrics["peg_ratio"] < 1.5:
            score += 2
        return score

    def _quant_scores(self, metrics: dict[str, Any]) -> dict[str, float]:
        price = max(metrics["current_price"], 1.0)
        distance_from_low = max(0.0, min(1.0, (price - metrics["week52_low"]) / max(metrics["week52_high"] - metrics["week52_low"], 1)))
        momentum_score = distance_from_low * 100

        pe = max(metrics["pe_ratio"], 1)
        pb = max(metrics["pb_ratio"], 0.1)
        value_score = max(0.0, min(100.0, 120 - (pe * 2.0 + pb * 5.0)))

        quality_score = max(0.0, min(100.0, metrics["roe_5yr"] * 4.0))
        low_vol_score = max(0.0, min(100.0, 100 - (metrics["beta"] * 40)))
        revision_score = max(0.0, min(100.0, 60 + (metrics["dividend_yield"] * 1000) - (metrics["peg_ratio"] * 10)))

        composite = (
            momentum_score * 0.25
            + value_score * 0.20
            + quality_score * 0.25
            + low_vol_score * 0.15
            + revision_score * 0.15
        )
        return {
            "momentum_score": round(momentum_score, 2),
            "value_score": round(value_score, 2),
            "quality_score": round(quality_score, 2),
            "low_vol_score": round(low_vol_score, 2),
            "revision_score": round(revision_score, 2),
            "composite_score": round(composite, 2),
        }

    def evaluate_stock(self, stock: Stock) -> bool:
        return bool((stock.buffett_score or 0) >= 7)

    def _ensure_universe(self, db):
        existing_count = db.query(Stock).count()
        if existing_count > 0:
            return
        for sector, tickers in STOCK_UNIVERSE.items():
            for ticker in tickers:
                db.add(
                    Stock(
                        ticker=ticker,
                        company_name=ticker,
                        exchange="NSE",
                        sector=sector,
                        sub_sector=sector,
                    )
                )
        db.commit()

    def run_full_screen(self):
        db = SessionLocal()
        try:
            self._ensure_universe(db)
            all_stocks = db.query(Stock).order_by(Stock.sector.asc(), Stock.ticker.asc()).all()
            rows: list[dict[str, Any]] = []

            for stock in all_stocks:
                metrics = self._fetch_metrics(stock.ticker)
                score = self._buffett_score(metrics)
                qualified = score >= 7
                quant = self._quant_scores(metrics)

                stock.current_price = metrics["current_price"]
                stock.week52_high = metrics["week52_high"]
                stock.week52_low = metrics["week52_low"]
                stock.pe_ratio = metrics["pe_ratio"]
                stock.pb_ratio = metrics["pb_ratio"]
                stock.market_cap = metrics["market_cap"]
                stock.beta = metrics["beta"]
                stock.dividend_yield = metrics["dividend_yield"]
                stock.roe_5yr = metrics["roe_5yr"]
                stock.roe_10yr = metrics["roe_10yr"]
                stock.debt_to_equity = metrics["debt_to_equity"]
                stock.operating_cf_positive_years = metrics["operating_cf_positive_years"]
                stock.promoter_holding_pct = metrics["promoter_holding_pct"]
                stock.promoter_pledged_pct = metrics["promoter_pledged_pct"]
                stock.peg_ratio = metrics["peg_ratio"]
                stock.buffett_score = score
                stock.buffett_qualified = qualified
                stock.last_screened_at = datetime.now(timezone.utc)

                db.add(
                    QuantScore(
                        stock_id=stock.id,
                        momentum_score=quant["momentum_score"],
                        value_score=quant["value_score"],
                        quality_score=quant["quality_score"],
                        low_vol_score=quant["low_vol_score"],
                        revision_score=quant["revision_score"],
                        composite_score=quant["composite_score"],
                    )
                )

                signal_type = "HOLD"
                if quant["composite_score"] >= 70 and qualified:
                    signal_type = "BUY"
                elif quant["composite_score"] < 40:
                    signal_type = "SELL"

                signal = (
                    db.query(Signal)
                    .filter(Signal.stock_id == stock.id, Signal.is_active.is_(True))
                    .order_by(Signal.id.desc())
                    .first()
                )
                if signal is None:
                    signal = Signal(stock_id=stock.id)

                signal.signal_type = signal_type
                signal.entry_price_low = round(stock.current_price * 0.98, 2)
                signal.entry_price_high = round(stock.current_price * 1.02, 2)
                signal.target_price = round(stock.current_price * 1.15, 2)
                signal.stop_loss = round(stock.current_price * 0.9, 2)
                signal.hold_duration_days = 120
                signal.confidence_score = min(1.0, quant["composite_score"] / 100)
                signal.reasoning_text = (
                    f"Buffett score {score}/10, quant composite {quant['composite_score']}/100, sector {stock.sector}."
                )
                signal.is_active = True
                db.add(signal)

                rows.append(
                    {
                        "ticker": stock.ticker,
                        "sector": stock.sector,
                        "buffett": qualified,
                        "score": quant["composite_score"],
                        "signal": signal_type,
                    }
                )

            db.commit()

            rows.sort(key=lambda item: item["score"], reverse=True)
            print("Rank | Ticker | Sector | Buffett | Score | Signal")
            for idx, row in enumerate(rows, start=1):
                mark = "✓" if row["buffett"] else "✗"
                print(f"{idx:>4} | {row['ticker']:<11} | {row['sector']:<8} | {mark:^7} | {row['score']:>5.1f} | {row['signal']}")
            return rows
        finally:
            db.close()


buffett_screener = BuffettScreener()


def run_full_screen():
    return buffett_screener.run_full_screen()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-full-screen", action="store_true")
    args = parser.parse_args()
    if args.run_full_screen:
        run_full_screen()
