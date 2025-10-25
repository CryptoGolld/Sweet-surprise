# 💰 Market Cap Calculation (Bonding Curve)

## The Right Way

**Market Cap** = Current Price × 1B (total supply)  
**FDV** = Current Price × 1B (total supply)

For bonding curve tokens: **Market Cap = FDV**

---

## Formula

### **Market Cap:**
```
Market Cap = Current Price × Total Supply (1B)

Example:
- Price: 0.00001 SUI/token
- Total supply: 1,000,000,000 (1B)
- Market Cap: 10,000 SUI ✅
- FDV: 10,000 SUI ✅ (same)
```

**Why Price × 1B?**
- Simple, consistent valuation
- MC = FDV for bonding curve tokens
- Easy to compare across all tokens
- Shows full value at current price

---

## What We Track

### **Market Cap & FDV:**
```javascript
const totalSupply = 1_000_000_000;
market_cap_sui = current_price × totalSupply;
fully_diluted_valuation_sui = current_price × totalSupply;
```

Both are the same for bonding curve tokens.

### **Current Price:**
```javascript
current_price_sui = latest_trade_price
```

Price of 1 token in SUI.

---

## Examples

### **Token at Start (0 tokens sold):**

```
Tokens Sold:     0 / 737M (0%)
Current Price:   0.000001 SUI/token (virtual)

Market Cap:      1,000 SUI (0.000001 × 1B) ✅
FDV:             1,000 SUI ✅
MC/FDV:          100% (same)
Progress:        0%
```

### **Token at 50% Progress:**

```
Tokens Sold:     368M / 737M (50%)
Current Price:   0.00001234 SUI/token

Market Cap:      12,340 SUI (0.00001234 × 1B) ✅
FDV:             12,340 SUI ✅
MC/FDV:          100% (same)
Progress:        50%
```

### **Token at 100% Progress (Graduated):**

```
Tokens Sold:     737M / 737M (100%)
Current Price:   0.00002000 SUI/token

Market Cap:      20,000 SUI (0.00002 × 1B) ✅
FDV:             20,000 SUI ✅
MC/FDV:          100% (same)
Status:          Graduated 🎓
```

---

## Why Price × 1B?

### **Simple & Consistent:**

```
✅ CORRECT:
Price:       0.00001 SUI/token
Market Cap:  10,000 SUI (0.00001 × 1B)
FDV:         10,000 SUI (same)
```

**Rationale:**
- Clean, simple calculation
- MC = FDV for bonding curve tokens
- Easy comparison across all tokens
- Shows full valuation at current price
- Industry standard method

---

## Display on Frontend

### **Token Card:**

```tsx
<TokenCard>
  <div>Price: {token.currentPrice.toFixed(8)} SUI</div>
  <div>Market Cap: {token.marketCap.toFixed(0)} SUI</div>
  <div>FDV: {token.fullyDilutedValuation.toFixed(0)} SUI</div>
  <div>Progress: {(token.curveSupply / 737_000_000 * 100).toFixed(1)}%</div>
</TokenCard>
```

**Shows:**
```
Price:      0.00001234 SUI
Market Cap: 6,666 SUI       ← SUI locked in curve
FDV:        12,340 SUI      ← Theoretical if all minted
Progress:   50%             ← To graduation
```

---

### **Sorting:**

```bash
# Sort by market cap (biggest = most SUI locked)
GET /api/tokens?sort=marketcap

# Will show:
1. TokenA: 12,000 SUI MC (near graduation)
2. TokenB: 8,500 SUI MC
3. TokenC: 5,000 SUI MC
```

This is CORRECT because:
- TokenA has 12k SUI locked (almost graduated)
- TokenB has 8.5k SUI locked
- TokenC has 5k SUI locked

---

## Benefits of This Method

### ✅ **Simple & Clean:**
One formula for all tokens: price × 1B

### ✅ **Fair Comparison:**
Easy to compare tokens at any progress level

### ✅ **MC = FDV:**
No confusion - both show same value

### ✅ **Industry Standard:**
Used by most platforms for consistent valuation

### ✅ **Shows Full Value:**
Complete valuation at current price

---

## Metrics Summary

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Market Cap** | `price × 1B` | Total value at current price |
| **FDV** | `price × 1B` | Same as Market Cap |
| **Current Price** | Latest trade | Price per token |
| **MC/FDV Ratio** | Always 100% | MC equals FDV |
| **Progress** | `tokens_sold / 737M × 100` | % to graduation |
| **24h Volume** | Sum of trades | Trading activity |

---

## When Token Graduates

After graduation at 13,333 SUI:
- Market Cap becomes traditional (price × circulating supply)
- Because it's now on Cetus DEX, not bonding curve
- But we can still show "Graduated at 13,333 SUI MC"

---

## Code Implementation

```javascript
// Get latest price
const currentPrice = parseFloat(latestTrade.price_per_token);

// Market Cap = Price × Total Supply
const totalSupply = 1_000_000_000;
const marketCap = currentPrice * totalSupply;

// FDV = Same as Market Cap
const fullyDilutedValuation = marketCap;

// MC/FDV Ratio (always 100%)
const mcFdvRatio = 100;

// Progress to graduation
const curveSupply = parseFloat(tokenData.curve_supply);
const progress = (curveSupply / 737_000_000) * 100;
```

---

## Summary

**For bonding curve tokens:**
- ✅ Market Cap = Price × 1B
- ✅ FDV = Price × 1B
- ✅ MC = FDV (always 100%)

**This shows:**
- Simple, clean calculation ✅
- Easy comparison ✅
- Full valuation at current price ✅
- Industry standard ✅

**Market Cap = Price × 1 Billion tokens!** 📊
