from models.schema import Signal


class MarketEngine:
    def evaluate_news_impact(
        self,
        news_event: dict,
        sentiment: dict,
        entities: list,
        stocks: list,
    ) -> list[Signal]:
        signals: list[Signal] = []

        label = sentiment.get("label", "neutral")
        score = float(sentiment.get("score", 0.0))

        signal_type = "HOLD"
        if label == "positive" and score > 0.7:
            signal_type = "BUY"
        elif label == "negative" and score > 0.7:
            signal_type = "SELL"

        if signal_type != "HOLD":
            for stock in stocks:
                signal = Signal(
                    stock_id=stock.id,
                    signal_type=signal_type,
                    confidence_score=score,
                    reasoning_text=f"Generated via market engine based on sentiment: {label}",
                    is_active=True,
                )
                signals.append(signal)

        return signals


market_engine = MarketEngine()
