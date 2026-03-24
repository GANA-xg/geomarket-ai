"""initial

Revision ID: 20260323_0001
Revises:
Create Date: 2026-03-23 00:00:01.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260323_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "news_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("headline", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("region", sa.String(), nullable=True),
        sa.Column("sentiment_score", sa.Float(), nullable=True),
        sa.Column("sentiment_label", sa.String(), nullable=True),
        sa.Column("sentiment_confidence", sa.Float(), nullable=True),
        sa.Column("combined_sentiment_score", sa.Float(), nullable=True),
        sa.Column("entities_json", sa.JSON(), nullable=True),
        sa.Column("affected_sectors_json", sa.JSON(), nullable=True),
        sa.Column("event_type", sa.String(), nullable=True),
        sa.Column("primary_region", sa.String(), nullable=True),
        sa.Column("market_impact_direction", sa.Integer(), nullable=True),
        sa.Column("impact_magnitude", sa.String(), nullable=True),
        sa.Column("india_specific_impact", sa.Text(), nullable=True),
        sa.Column("affected_indian_stocks_json", sa.JSON(), nullable=True),
        sa.Column("llm_analysis_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_news_events_id"), "news_events", ["id"], unique=False)

    op.create_table(
        "stocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(), nullable=False),
        sa.Column("company_name", sa.String(), nullable=True),
        sa.Column("exchange", sa.String(), nullable=True),
        sa.Column("sector", sa.String(), nullable=True),
        sa.Column("sub_sector", sa.String(), nullable=True),
        sa.Column("current_price", sa.Float(), nullable=True),
        sa.Column("week52_high", sa.Float(), nullable=True),
        sa.Column("week52_low", sa.Float(), nullable=True),
        sa.Column("pe_ratio", sa.Float(), nullable=True),
        sa.Column("pb_ratio", sa.Float(), nullable=True),
        sa.Column("market_cap", sa.Float(), nullable=True),
        sa.Column("beta", sa.Float(), nullable=True),
        sa.Column("dividend_yield", sa.Float(), nullable=True),
        sa.Column("roe_5yr", sa.Float(), nullable=True),
        sa.Column("roe_10yr", sa.Float(), nullable=True),
        sa.Column("debt_to_equity", sa.Float(), nullable=True),
        sa.Column("operating_cf_positive_years", sa.Integer(), nullable=True),
        sa.Column("promoter_holding_pct", sa.Float(), nullable=True),
        sa.Column("promoter_pledged_pct", sa.Float(), nullable=True),
        sa.Column("peg_ratio", sa.Float(), nullable=True),
        sa.Column("buffett_score", sa.Integer(), nullable=True),
        sa.Column("dividend_history", sa.JSON(), nullable=True),
        sa.Column("last_screened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("buffett_qualified", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stocks_id"), "stocks", ["id"], unique=False)
    op.create_index(op.f("ix_stocks_ticker"), "stocks", ["ticker"], unique=True)

    op.create_table(
        "geo_markers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("news_event_id", sa.Integer(), nullable=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column("impact_color", sa.String(), nullable=True),
        sa.Column("affected_sectors_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["news_event_id"], ["news_events.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_geo_markers_id"), "geo_markers", ["id"], unique=False)

    op.create_table(
        "quant_scores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stock_id", sa.Integer(), nullable=True),
        sa.Column("momentum_score", sa.Float(), nullable=True),
        sa.Column("value_score", sa.Float(), nullable=True),
        sa.Column("quality_score", sa.Float(), nullable=True),
        sa.Column("low_vol_score", sa.Float(), nullable=True),
        sa.Column("revision_score", sa.Float(), nullable=True),
        sa.Column("composite_score", sa.Float(), nullable=True),
        sa.Column("scored_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["stock_id"], ["stocks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_quant_scores_id"), "quant_scores", ["id"], unique=False)

    op.create_table(
        "portfolio",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("stock_id", sa.Integer(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=True),
        sa.Column("entry_price", sa.Float(), nullable=True),
        sa.Column("entry_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("exit_price", sa.Float(), nullable=True),
        sa.Column("exit_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["stock_id"], ["stocks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_portfolio_id"), "portfolio", ["id"], unique=False)

    op.create_table(
        "signals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stock_id", sa.Integer(), nullable=True),
        sa.Column("news_event_id", sa.Integer(), nullable=True),
        sa.Column("signal_type", sa.String(), nullable=True),
        sa.Column("entry_price_low", sa.Float(), nullable=True),
        sa.Column("entry_price_high", sa.Float(), nullable=True),
        sa.Column("target_price", sa.Float(), nullable=True),
        sa.Column("stop_loss", sa.Float(), nullable=True),
        sa.Column("hold_duration_days", sa.Integer(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("reasoning_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["news_event_id"], ["news_events.id"]),
        sa.ForeignKeyConstraint(["stock_id"], ["stocks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_signals_id"), "signals", ["id"], unique=False)

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("portfolio_id", sa.Integer(), nullable=True),
        sa.Column("alert_type", sa.String(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("acknowledged", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["portfolio_id"], ["portfolio.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alerts_id"), "alerts", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_alerts_id"), table_name="alerts")
    op.drop_table("alerts")
    op.drop_index(op.f("ix_signals_id"), table_name="signals")
    op.drop_table("signals")
    op.drop_index(op.f("ix_portfolio_id"), table_name="portfolio")
    op.drop_table("portfolio")
    op.drop_index(op.f("ix_quant_scores_id"), table_name="quant_scores")
    op.drop_table("quant_scores")
    op.drop_index(op.f("ix_geo_markers_id"), table_name="geo_markers")
    op.drop_table("geo_markers")
    op.drop_index(op.f("ix_stocks_ticker"), table_name="stocks")
    op.drop_index(op.f("ix_stocks_id"), table_name="stocks")
    op.drop_table("stocks")
    op.drop_index(op.f("ix_news_events_id"), table_name="news_events")
    op.drop_table("news_events")
