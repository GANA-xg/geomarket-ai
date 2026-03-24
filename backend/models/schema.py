from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.session import Base

class NewsEvent(Base):
    __tablename__ = "news_events"
    id = Column(Integer, primary_key=True, index=True)
    headline = Column(String, nullable=False)
    source = Column(String)
    published_at = Column(DateTime(timezone=True))
    raw_text = Column(Text)
    region = Column(String)
    sentiment_score = Column(Float)
    sentiment_label = Column(String)
    sentiment_confidence = Column(Float)
    combined_sentiment_score = Column(Float)
    entities_json = Column(JSON)
    affected_sectors_json = Column(JSON)
    event_type = Column(String)
    primary_region = Column(String)
    market_impact_direction = Column(Integer)
    impact_magnitude = Column(String)
    india_specific_impact = Column(Text)
    affected_indian_stocks_json = Column(JSON)
    llm_analysis_json = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    geo_markers = relationship("GeoMarker", back_populates="news_event")
    signals = relationship("Signal", back_populates="news_event")

class GeoMarker(Base):
    __tablename__ = "geo_markers"
    id = Column(Integer, primary_key=True, index=True)
    news_event_id = Column(Integer, ForeignKey("news_events.id"))
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    country = Column(String)
    impact_color = Column(String)  # e.g., 'red', 'green', 'yellow' Based on sentiment/event
    affected_sectors_json = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    news_event = relationship("NewsEvent", back_populates="geo_markers")

class Stock(Base):
    __tablename__ = "stocks"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True, nullable=False)
    company_name = Column(String)
    exchange = Column(String)
    sector = Column(String)
    sub_sector = Column(String)
    current_price = Column(Float)
    week52_high = Column(Float)
    week52_low = Column(Float)
    pe_ratio = Column(Float)
    pb_ratio = Column(Float)
    market_cap = Column(Float)
    beta = Column(Float)
    dividend_yield = Column(Float)
    
    # Fundamental/Buffett Data
    roe_5yr = Column(Float)
    roe_10yr = Column(Float)
    debt_to_equity = Column(Float)
    operating_cf_positive_years = Column(Integer)
    promoter_holding_pct = Column(Float)
    promoter_pledged_pct = Column(Float)
    peg_ratio = Column(Float)
    buffett_score = Column(Integer, default=0)
    dividend_history = Column(JSON)
    last_screened_at = Column(DateTime(timezone=True))
    buffett_qualified = Column(Boolean, default=False)

    quant_scores = relationship("QuantScore", back_populates="stock")
    signals = relationship("Signal", back_populates="stock")
    portfolio_entries = relationship("Portfolio", back_populates="stock")

class QuantScore(Base):
    __tablename__ = "quant_scores"
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"))
    momentum_score = Column(Float)
    value_score = Column(Float)
    quality_score = Column(Float)
    low_vol_score = Column(Float)
    revision_score = Column(Float)
    composite_score = Column(Float)
    scored_at = Column(DateTime(timezone=True), server_default=func.now())

    stock = relationship("Stock", back_populates="quant_scores")

class Signal(Base):
    __tablename__ = "signals"
    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"))
    news_event_id = Column(Integer, ForeignKey("news_events.id"), nullable=True)
    signal_type = Column(String)  # BUY, SELL, HOLD
    entry_price_low = Column(Float)
    entry_price_high = Column(Float)
    target_price = Column(Float)
    stop_loss = Column(Float)
    hold_duration_days = Column(Integer)
    confidence_score = Column(Float)
    reasoning_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    stock = relationship("Stock", back_populates="signals")
    news_event = relationship("NewsEvent", back_populates="signals")

class Portfolio(Base):
    __tablename__ = "portfolio"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer) # Can link to users table if added
    stock_id = Column(Integer, ForeignKey("stocks.id"))
    quantity = Column(Integer)
    entry_price = Column(Float)
    entry_date = Column(DateTime(timezone=True))
    exit_price = Column(Float, nullable=True)
    exit_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String) # OPEN, CLOSED

    stock = relationship("Stock", back_populates="portfolio_entries")
    alerts = relationship("Alert", back_populates="portfolio_entry")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolio.id"))
    alert_type = Column(String) # SELL_NOW, TARGET_HIT, STOP_LOSS_HIT
    message = Column(Text)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged = Column(Boolean, default=False)

    portfolio_entry = relationship("Portfolio", back_populates="alerts")
