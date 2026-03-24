import os
import sys

from sqlalchemy.orm import Session

sys.path.insert(0, "/app")

from models.schema import QuantScore, Stock

class QuantFactorEngine:
    def __init__(self):
        # Weights for different factors
        self.weights = {
            "momentum": 0.25,
            "value": 0.2,
            "quality": 0.25,
            "low_volatility": 0.15,
            "revision": 0.15,
        }

    def generate_scores(self, db: Session, stock_id: int, market_data: dict) -> QuantScore:
        """
        Calculate Wall Street quant factors for a specific stock.
        """
        # In reality, complex statistics are calculated here.
        # This is a dummy skeleton generating random-ish numbers based on inputs.
        
        # Pull stock from DB
        stock = db.query(Stock).filter(Stock.id == stock_id).first()
        if not stock:
            return None

        # Dummy calculations
        momentum = min(100, max(0, market_data.get('price_change_6mo', 0) * 2 + 50))
        value_score = min(100, max(0, 100 - (stock.peg_ratio or 1) * 20))
        quality_score = min(100, max(0, (stock.roe_5yr or 0) * 4))
        low_vol_score = 60.0 # Dummy
        revision_score = 55.0 # Dummy

        composite = (
            momentum * self.weights["momentum"] +
            value_score * self.weights["value"] +
            quality_score * self.weights["quality"] +
            low_vol_score * self.weights["low_volatility"] +
            revision_score * self.weights["revision"]
        )

        quant_score = QuantScore(
            stock_id=stock_id,
            momentum_score=momentum,
            value_score=value_score,
            quality_score=quality_score,
            low_vol_score=low_vol_score,
            revision_score=revision_score,
            composite_score=composite
        )
        db.add(quant_score)
        db.commit()
        db.refresh(quant_score)

        return quant_score

quant_engine = QuantFactorEngine()
