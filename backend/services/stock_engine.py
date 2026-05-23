from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.schema import Stock


class StockEngine:
    def search_stocks(self, db: Session, query: str = "") -> list[Stock]:
        if query:
            return (
                db.query(Stock)
                .filter(
                    Stock.ticker.ilike(f"%{query}%")
                    | Stock.company_name.ilike(f"%{query}%")
                )
                .all()
            )
        return db.query(Stock).limit(100).all()

    def get_stock(self, db: Session, stock_id: int) -> Stock | None:
        return db.query(Stock).filter(Stock.id == stock_id).first()

    def update_stock_metrics(self, db: Session, stock_id: int, new_data: dict) -> Stock | None:
        stock = self.get_stock(db, stock_id)
        if stock:
            for key, value in new_data.items():
                setattr(stock, key, value)
            stock.last_screened_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(stock)
        return stock


stock_engine = StockEngine()
