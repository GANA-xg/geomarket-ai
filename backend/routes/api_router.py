from collections import Counter
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

try:
    import yfinance as yf
except Exception:
    yf = None

from database.session import get_db  # noqa: E402
from models.schema import Alert, GeoMarker, NewsEvent, Portfolio, QuantScore, Signal, Stock  # noqa: E402
from routes.market import market_router  # noqa: E402
from services.heatmap_service import heatmap_service  # noqa: E402
from services.realtime_hub import realtime_hub  # noqa: E402

api_router = APIRouter()
api_router.include_router(market_router)
	

class PositionCreateRequest(BaseModel):
    ticker: str
    quantity: int
    entry_price: float
    entry_date: Optional[str] = None


class PositionUpdateRequest(BaseModel):
    quantity: int
    entry_price: float
    entry_date: Optional[str] = None


@api_router.get("/signals/latest")
def get_latest_signals(db: Session = Depends(get_db)):
    rows = (
        db.query(Signal, Stock)
        .join(Stock, Stock.id == Signal.stock_id)
        .filter(Signal.is_active.is_(True))
        .order_by(desc(Signal.confidence_score), desc(Signal.created_at))
        .limit(10)
        .all()
    )
    return [
        {
            "id": signal.id,
            "ticker": stock.ticker,
            "company_name": stock.company_name,
            "sector": stock.sector,
            "signal_type": signal.signal_type,
            "entry_price_low": signal.entry_price_low,
            "entry_price_high": signal.entry_price_high,
            "target_price": signal.target_price,
            "stop_loss": signal.stop_loss,
            "hold_duration_days": signal.hold_duration_days,
            "confidence_score": signal.confidence_score,
            "reasoning_text": signal.reasoning_text,
            "created_at": signal.created_at,
        }
        for signal, stock in rows
    ]


@api_router.get("/stocks")
def get_stocks(
    sector: Optional[str] = Query(default=None),
    signal: Optional[str] = Query(default=None),
    buffett: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Stock)
    if sector:
        query = query.filter(Stock.sector.ilike(sector))
    if buffett is not None:
        query = query.filter(Stock.buffett_qualified.is_(buffett))

    stocks = query.order_by(Stock.ticker.asc()).all()
    payload = []
    for stock in stocks:
        latest_quant = (
            db.query(QuantScore)
            .filter(QuantScore.stock_id == stock.id)
            .order_by(QuantScore.scored_at.desc(), QuantScore.id.desc())
            .first()
        )
        latest_signal = (
            db.query(Signal)
            .filter(Signal.stock_id == stock.id, Signal.is_active.is_(True))
            .order_by(Signal.created_at.desc(), Signal.id.desc())
            .first()
        )
        latest_signal_type = latest_signal.signal_type if latest_signal else "HOLD"

        if signal and latest_signal_type.upper() != signal.upper():
            continue

        payload.append(
            {
                "id": stock.id,
                "ticker": stock.ticker,
                "company_name": stock.company_name,
                "sector": stock.sector,
                "buffett_qualified": stock.buffett_qualified,
                "buffett_score": stock.buffett_score,
                "current_price": stock.current_price,
                "pe_ratio": stock.pe_ratio,
                "pb_ratio": stock.pb_ratio,
                "market_cap": stock.market_cap,
                "beta": stock.beta,
                "dividend_yield": stock.dividend_yield,
                "composite_score": latest_quant.composite_score if latest_quant else None,
                "latest_signal": latest_signal_type,
            }
        )
    return payload


@api_router.get("/news/latest")
def get_latest_news(db: Session = Depends(get_db)):
    rows = db.query(NewsEvent).order_by(NewsEvent.published_at.desc(), NewsEvent.id.desc()).limit(50).all()
    return [
        {
            "id": row.id,
            "headline": row.headline,
            "source": row.source,
            "published_at": row.published_at,
            "sentiment_label": row.sentiment_label,
            "sentiment_score": row.sentiment_score,
            "affected_sectors": row.affected_sectors_json or [],
            "event_type": row.event_type,
            "region": row.primary_region or row.region,
        }
        for row in rows
    ]


@api_router.get("/geo-markers")
def get_geo_markers(db: Session = Depends(get_db)):
    rows = db.query(GeoMarker, NewsEvent).join(NewsEvent, NewsEvent.id == GeoMarker.news_event_id).order_by(GeoMarker.id.desc()).limit(200).all()
    return [
        {
            "id": marker.id,
            "lat": marker.lat,
            "lng": marker.lng,
            "impact_color": marker.impact_color,
            "headline": news.headline,
            "sectors": marker.affected_sectors_json or [],
            "timestamp": marker.created_at,
        }
        for marker, news in rows
    ]


@api_router.get("/geo-heatmap")
async def get_geo_heatmap(db: Session = Depends(get_db)):
    return await heatmap_service.build_heatmap(db=db, max_articles=30, max_points=100)


@api_router.get("/portfolio/summary")
def get_portfolio_summary(db: Session = Depends(get_db)):
    rows = (
        db.query(Portfolio, Stock)
        .join(Stock, Stock.id == Portfolio.stock_id)
        .filter(Portfolio.status == "OPEN")
        .order_by(Portfolio.entry_date.desc().nullslast(), Portfolio.id.desc())
        .all()
    )

    payload = []
    for position, stock in rows:
        current_price = stock.current_price
        if yf:
            try:
                yf_info = yf.Ticker(f"{stock.ticker}.NS").fast_info
                current_price = float(yf_info.last_price) if yf_info and yf_info.last_price else current_price
            except Exception:
                pass

        if current_price is None:
            current_price = position.entry_price

        unrealised_pnl = (current_price - position.entry_price) * position.quantity
        pnl_pct = ((current_price - position.entry_price) / position.entry_price) * 100 if position.entry_price else 0

        payload.append(
            {
                "portfolio_id": position.id,
                "ticker": stock.ticker,
                "company_name": stock.company_name,
                "quantity": position.quantity,
                "entry_price": position.entry_price,
                "current_price": round(current_price, 2),
                "unrealised_pnl": round(unrealised_pnl, 2),
                "pnl_pct": round(pnl_pct, 2),
                "entry_date": position.entry_date,
                "status": position.status,
            }
        )
    return payload


@api_router.post("/portfolio/positions")
async def create_position(request: PositionCreateRequest, db: Session = Depends(get_db)):
    stock = db.query(Stock).filter(Stock.ticker == request.ticker.upper()).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Ticker not found")

    entry_date = datetime.now(timezone.utc)
    if request.entry_date:
        try:
            entry_date = datetime.fromisoformat(request.entry_date)
        except Exception:
            pass

    position = Portfolio(
        user_id=1,
        stock_id=stock.id,
        quantity=request.quantity,
        entry_price=request.entry_price,
        entry_date=entry_date,
        status="OPEN",
    )
    db.add(position)
    db.commit()
    db.refresh(position)

    latest_signal = (
        db.query(Signal)
        .filter(Signal.stock_id == stock.id, Signal.is_active.is_(True))
        .order_by(Signal.created_at.desc(), Signal.id.desc())
        .first()
    )

    if latest_signal and latest_signal.signal_type == "SELL":
        alert = Alert(
            portfolio_id=position.id,
            alert_type="SELL_NOW",
            message=f"{stock.ticker} has an active SELL signal. Review position.",
        )
        db.add(alert)
        db.commit()
        await realtime_hub.broadcast(
            "alerts",
            {
                "alert_type": alert.alert_type,
                "message": alert.message,
                "ticker": stock.ticker,
                "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else datetime.now(timezone.utc).isoformat(),
            },
        )

    return {"status": "created", "portfolio_id": position.id}


@api_router.put("/portfolio/positions/{portfolio_id}")
async def update_position(portfolio_id: int, request: PositionUpdateRequest, db: Session = Depends(get_db)):
    position = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.status == "OPEN").first()
    if not position:
        raise HTTPException(status_code=404, detail="Open portfolio position not found")

    if request.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero")
    if request.entry_price <= 0:
        raise HTTPException(status_code=400, detail="Entry price must be greater than zero")

    position.quantity = request.quantity
    position.entry_price = request.entry_price
    if request.entry_date:
        try:
            position.entry_date = datetime.fromisoformat(request.entry_date)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid entry_date format")

    db.commit()
    return {"status": "updated", "portfolio_id": portfolio_id}


@api_router.delete("/portfolio/positions/{portfolio_id}")
async def delete_position(portfolio_id: int, db: Session = Depends(get_db)):
    position = db.query(Portfolio).filter(Portfolio.id == portfolio_id, Portfolio.status == "OPEN").first()
    if not position:
        raise HTTPException(status_code=404, detail="Open portfolio position not found")

    db.delete(position)
    db.commit()
    return {"status": "deleted", "portfolio_id": portfolio_id}


@api_router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_stocks_screened = db.query(func.count(Stock.id)).scalar() or 0
    buffett_qualified_count = db.query(func.count(Stock.id)).filter(Stock.buffett_qualified.is_(True)).scalar() or 0
    active_buy_signals = db.query(func.count(Signal.id)).filter(Signal.is_active.is_(True), Signal.signal_type == "BUY").scalar() or 0
    active_sell_signals = db.query(func.count(Signal.id)).filter(Signal.is_active.is_(True), Signal.signal_type == "SELL").scalar() or 0

    today = datetime.now(timezone.utc).date()
    news_processed_today = (
        db.query(func.count(NewsEvent.id))
        .filter(func.date(NewsEvent.created_at) == today)
        .scalar()
        or 0
    )

    bullish_rows = db.query(NewsEvent.affected_sectors_json).filter(NewsEvent.combined_sentiment_score > 0).all()
    bearish_rows = db.query(NewsEvent.affected_sectors_json).filter(NewsEvent.combined_sentiment_score < 0).all()

    bullish_counter = Counter()
    bearish_counter = Counter()
    for (sectors,) in bullish_rows:
        for sector in sectors or []:
            bullish_counter[sector] += 1
    for (sectors,) in bearish_rows:
        for sector in sectors or []:
            bearish_counter[sector] += 1

    avg_sentiment = db.query(func.avg(NewsEvent.combined_sentiment_score)).scalar() or 0.0
    global_sentiment = "NEUTRAL"
    if avg_sentiment > 0.15:
        global_sentiment = "POSITIVE"
    elif avg_sentiment < -0.15:
        global_sentiment = "NEGATIVE"

    return {
        "total_stocks_screened": total_stocks_screened,
        "buffett_qualified_count": buffett_qualified_count,
        "active_buy_signals": active_buy_signals,
        "active_sell_signals": active_sell_signals,
        "news_processed_today": news_processed_today,
        "top_bullish_sectors": [name for name, _count in bullish_counter.most_common(3)],
        "top_bearish_sectors": [name for name, _count in bearish_counter.most_common(3)],
        "global_sentiment": global_sentiment,
    }


@api_router.get("/alerts/latest")
def get_latest_alerts(db: Session = Depends(get_db)):
    rows = db.query(Alert, Portfolio, Stock).join(Portfolio, Portfolio.id == Alert.portfolio_id).join(Stock, Stock.id == Portfolio.stock_id).order_by(Alert.triggered_at.desc()).limit(20).all()
    return [
        {
            "alert_type": alert.alert_type,
            "message": alert.message,
            "ticker": stock.ticker,
            "triggered_at": alert.triggered_at,
        }
        for alert, _portfolio, stock in rows
    ]
