import os
import sys

from sqlalchemy.orm import Session

sys.path.insert(0, "/app")

from models.schema import Stock
from datetime import datetime

class StockEngine:
    def __init__(self):
        pass

    def search_stocks(self, db: Session, query: str = "") -> list[Stock]:
        """
        Retrieve stocks from database. If query exists, filter by ticker or company name.
        """
        if query:
            return db.query(Stock).filter(
                (Stock.ticker.ilike(f"%{query}%")) | 
                (Stock.company_name.ilike(f"%{query}%"))
            ).all()
        return db.query(Stock).limit(100).all()

    def get_stock(self, db: Session, stock_id: int) -> Stock:
        return db.query(Stock).filter(Stock.id == stock_id).first()

    def update_stock_metrics(self, db: Session, stock_id: int, new_data: dict) -> Stock:
        stock = self.get_stock(db, stock_id)
        if stock:
            for key, value in new_data.items():
                setattr(stock, key, value)
            stock.last_screened_at = datetime.utcnow()
            db.commit()
            db.refresh(stock)
        return stock

stock_engine = StockEngine()
