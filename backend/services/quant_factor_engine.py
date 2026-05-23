from sqlalchemy.orm import Session

from models.schema import QuantScore, Stock


class QuantFactorEngine:
    def __init__(self):
        self.weights = {
            "momentum": 0.25,
            "value": 0.20,
            "quality": 0.25,
            "low_volatility": 0.15,
            "revision": 0.15,
        }

    def generate_scores(self, db: Session, stock_id: int, market_data: dict) -> QuantScore | None:
        stock = db.query(Stock).filter(Stock.id == stock_id).first()
        if not stock:
            return None

        momentum = min(100.0, max(0.0, market_data.get("price_change_6mo", 0) * 2 + 50))
        value_score = min(100.0, max(0.0, 100 - (stock.peg_ratio or 1) * 20))
        quality_score = min(100.0, max(0.0, (stock.roe_5yr or 0) * 4))
        low_vol_score = 60.0
        revision_score = 55.0

        composite = (
            momentum * self.weights["momentum"]
            + value_score * self.weights["value"]
            + quality_score * self.weights["quality"]
            + low_vol_score * self.weights["low_volatility"]
            + revision_score * self.weights["revision"]
        )

        quant_score = QuantScore(
            stock_id=stock_id,
            momentum_score=momentum,
            value_score=value_score,
            quality_score=quality_score,
            low_vol_score=low_vol_score,
            revision_score=revision_score,
            composite_score=composite,
        )
        db.add(quant_score)
        db.commit()
        db.refresh(quant_score)
        return quant_score


quant_engine = QuantFactorEngine()
