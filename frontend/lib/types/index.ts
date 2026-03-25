export type SignalType = "BUY" | "SELL" | "HOLD";

export interface DashboardStats {
	total_stocks_screened: number;
	buffett_qualified_count: number;
	active_buy_signals: number;
	active_sell_signals: number;
	news_processed_today: number;
	top_bullish_sectors: string[];
	top_bearish_sectors: string[];
	global_sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}

export interface LatestSignal {
	id: number;
	ticker: string;
	company_name: string;
	sector: string;
	signal_type: SignalType;
	entry_price_low: number;
	entry_price_high: number;
	target_price: number;
	stop_loss: number;
	hold_duration_days: number;
	confidence_score: number;
	reasoning_text: string;
}

export interface StockRow {
	id: number;
	ticker: string;
	company_name: string;
	sector: string;
	buffett_qualified: boolean;
	buffett_score: number;
	current_price: number;
	composite_score: number;
	latest_signal: SignalType;
}

export interface NewsItem {
	id: number;
	headline: string;
	source: string;
	published_at: string;
	sentiment_label: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
	sentiment_score: number;
	affected_sectors: string[];
}

export interface GeoMarkerItem {
	id: number;
	lat: number;
	lng: number;
	impact_color: "GREEN" | "RED" | "YELLOW";
	headline: string;
	sectors: string[];
	timestamp: string;
}

export type HeatPoint = [number, number, number];

export interface PortfolioEntry {
	portfolio_id: number;
	ticker: string;
	company_name: string;
	quantity: number;
	entry_price: number;
	current_price: number;
	unrealised_pnl: number;
	pnl_pct: number;
	entry_date: string;
	status: "OPEN" | "CLOSED";
}
