# Chart System Analysis - Fresh Investigation

## Executive Summary
The chart system has **CRITICAL ISSUES** that make it completely non-functional for most tokens.

---

## How Charts Are SUPPOSED To Work

### Architecture
1. **Frontend Components**:
   - `TradingViewChart` - Full-featured candlestick chart using lightweight-charts library
   - `PriceChart` - Simple SVG-based candlestick chart
   - Both wrapped in dynamic imports (`TradingViewChartWrapper`, `PriceChartWrapper`) to prevent SSR hydration errors

2. **Data Flow**:
   - Frontend → `/api/proxy/chart/[coinType]` (Next.js proxy)
   - Next.js proxy → `http://51.20.74.15:3003/api/chart/:coinType` (Indexer API)
   - Indexer API → Generates candles ON-DEMAND from trades in database

3. **Chart Types**:
   - **1-minute candles**: OHLCV (Open, High, Low, Close, Volume) aggregated per minute
   - **Intervals offered**: 1m, 5m, 15m, 1h, 4h, 1d (in UI)
   - **Time range**: Last 24 hours only

---

## CRITICAL ISSUES FOUND

### Issue #1: **24-Hour Window Limitation** 🚨 CRITICAL
**Location**: `indexer/api-server.js` lines 107-118

**Problem**:
```javascript
WHERE coin_type = $1
  AND timestamp > NOW() - INTERVAL '24 hours'  // <-- ONLY LAST 24 HOURS!
```

**Impact**:
- Tokens with NO trades in last 24 hours = EMPTY CHART (even if they have 1000s of historical trades)
- Most tokens show "No Trading History Yet" when they actually have history
- Makes charts useless for low-volume tokens

**Solution**: Change to show ALL historical trades, not just 24 hours

---

### Issue #2: **Interval Parameter Completely Ignored** 🚨 CRITICAL
**Location**: `indexer/api-server.js` line 104

**Problem**:
```javascript
const interval = req.query.interval || '1m';  // <-- CAPTURED BUT NEVER USED!
```

The API receives interval (1m, 5m, 1h, 1d) but ALWAYS generates 1-minute candles.

**Impact**:
- When user clicks "1d" (daily candles), they still get 1-minute candles
- Generates 1440 candles for everything (wasteful, slow)
- Charts show way too much detail for longer timeframes

**Solution**: Actually implement interval-based aggregation

---

### Issue #3: **Generates 1440 Candles Even With Zero Trades** ⚠️ MAJOR
**Location**: `indexer/api-server.js` lines 140-183

**Problem**:
```javascript
// Generate candles for each minute in last 24 hours
for (let candleTime = new Date(chartStartTime); candleTime <= currentTime && candleCount < MAX_CANDLES; ...) {
  // This runs 1440 times even if there are 0 trades!
}
```

**Impact**:
- Generates 1440 flat candles (all same price) when no trades exist
- Wastes CPU and bandwidth
- Charts look weird with thousands of zero-volume candles

**Solution**: Only generate candles where trades actually exist, or implement smarter fill-forward

---

###Issue #4: **Chart Component Requests Wrong Limit**
**Location**: `components/charts/TradingViewChart.tsx` line 28

**Problem**:
```javascript
?interval=1m&limit=1000  // <-- Requests 1000 candles, but 1m × 1000 = 16.6 hours (not full 24h!)
```

**Location**: `components/charts/PriceChart.tsx` line 26
```javascript
?interval=${interval}&limit=100  // <-- Only 100 candles!
```

**Impact**:
- TradingViewChart: Gets incomplete data (only 16.6 hours)
- PriceChart: Only shows 100 minutes (1.6 hours) for 1m interval!
- User thinks there's no data when there is

**Solution**: Request appropriate limits based on interval

---

### Issue #5: **Wrong Time Range Calculation**
**Location**: `components/charts/PriceChart.tsx` lines 65-69

**Problem**:
```javascript
const firstCandle = candles[candles.length - 1];  // OLDEST
const lastCandle = candles[0];  // NEWEST
const priceChange = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
```

API returns candles in descending order (newest first), but the calculation assumes oldest → newest.

**Impact**:
- Price change % is backwards (showing -5% when it's actually +5%)
- "24h Change" is wrong

**Solution**: Fix array order handling

---

### Issue #6: **Currency Display Always Shows "SUILFG"** 🐛 MINOR
**Location**: `components/charts/PriceChart.tsx` line 87

**Problem**:
```javascript
{lastCandle?.close.toFixed(8)} SUILFG  // <-- Hardcoded testnet token!
```

**Impact**:
- On mainnet, shows "SUILFG" instead of "SUI"
- Confusing for users

**Solution**: Use environment-based token symbol

---

### Issue #7: **No Support for Different Intervals in Backend**
**Problem**: The backend candle generation is hardcoded to 1-minute aggregation. There's NO logic to aggregate into 5m, 15m, 1h, 4h, or 1d candles.

**Impact**:
- Frontend offers 6 interval options, but they all show the same data
- Longer timeframes (4h, 1d) are unusable (too many candles)

**Solution**: Implement proper interval aggregation in backend

---

### Issue #8: **No Caching or Optimization**
**Problem**: Every chart request regenerates candles from scratch by looping through all trades.

**Impact**:
- Slow response times
- High database load
- Wasted CPU

**Solution**: Cache generated candles or pre-compute them

---

## What Charts SHOULD Show

Based on the code analysis:

1. **Time Intervals**: User should be able to switch between:
   - 1m (1-minute candles) - Last 24 hours (1440 candles)
   - 5m (5-minute candles) - Last 24 hours (288 candles)
   - 15m (15-minute candles) - Last 24 hours (96 candles)
   - 1h (1-hour candles) - Last 7 days (168 candles)
   - 4h (4-hour candles) - Last 30 days (180 candles)
   - 1d (daily candles) - Last 90 days (90 candles)

2. **Data Shown**:
   - OHLCV candles (Open, High, Low, Close, Volume)
   - Color-coded: Green for bullish, Red for bearish
   - Stats: 24h High, 24h Low, 24h Change%, Number of trades

3. **Behavior**:
   - Show ALL historical trades (not just 24 hours)
   - Update in real-time (refetch every 3-5 seconds)
   - Show "No Trading History Yet" only if token has NEVER been traded
   - For periods with no trades, show flat candles at last known price

---

## Priority Fixes

1. **CRITICAL**: Remove 24-hour limitation - show ALL historical trades
2. **CRITICAL**: Implement interval-based aggregation (1m, 5m, 1h, 1d)
3. **MAJOR**: Fix limit calculations in frontend
4. **MAJOR**: Fix price change % calculation
5. **MINOR**: Fix hardcoded "SUILFG" currency display
