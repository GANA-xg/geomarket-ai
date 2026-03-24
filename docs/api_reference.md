# GeoMarket AI API Reference

### Base URL: `http://localhost:8000/api`

## Endpoints

### `GET /stocks`
Fetch all stocks tracked by the system.
- **Query Params**: `query` (optional search), `skip`, `limit`

### `GET /stocks/{stock_id}/screen`
Runs the Warren Buffett screener and Wall Street quant factor engine on a specific stock.
- **Returns**: Combination of fundamental qualification booleans and calculated quant scores (momentum, growth, value).

### `GET /news`
Fetches the latest geopolitically processed news events.
- **Returns**: List of `NewsEvent` objects containing FinBERT sentiment labels and spaCy entities.

### `GET /geomarkers`
Fetches mapping points for the frontend Leaflet component.
- **Returns**: List of markers with latitude, longitude, and impact colors.

### `GET /signals`
Fetches active trading signals computed by the `market_engine`.

## WebSockets

### `WS /ws`
The WebSocket stream pushes real-time event updates to connected UI components such as the dashboard and map.
