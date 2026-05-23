from sqlalchemy.orm import Session

from models.schema import Alert, Portfolio


class PortfolioTracker:
    def add_position(
        self,
        db: Session,
        user_id: int,
        stock_id: int,
        quantity: int,
        entry_price: float,
    ) -> Portfolio:
        position = Portfolio(
            user_id=user_id,
            stock_id=stock_id,
            quantity=quantity,
            entry_price=entry_price,
            status="OPEN",
        )
        db.add(position)
        db.commit()
        db.refresh(position)
        return position

    def check_alerts(self, db: Session, portfolio_id: int, current_price: float) -> None:
        position = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
        if not position or position.status == "CLOSED":
            return

        if current_price < position.entry_price * 0.9:
            alert = Alert(
                portfolio_id=portfolio_id,
                alert_type="STOP_LOSS_HIT",
                message=f"Position dropped by 10%. Stop loss triggered at {current_price}.",
            )
            db.add(alert)
            db.commit()


portfolio_tracker = PortfolioTracker()
