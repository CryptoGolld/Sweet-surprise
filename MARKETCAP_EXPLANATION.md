# 💰 Market Cap Calculation (Bonding Curve)

## The Right Way (With Virtual Liquidity)

**Market Cap** = curve_balance + 1,000 SUI (virtual liquidity)  
**FDV** = Current Price × 1B (total supply)

---

## Formula

### **Market Cap (Bonding Curve with Virtual Liquidity):**
```
Market Cap = curve_balance + 1,000 SUI

Example at start (0 tokens sold):
- curve_balance: 0 SUI
- Virtual liquidity: 1,000 SUI
- Market Cap: 1,000 SUI ✅

Example at 50% (368M tokens sold):
- curve_balance: ~6,666 SUI
- Virtual liquidity: 1,000 SUI
- Market Cap: 7,666 SUI ✅

Example at 100% (737M tokens sold, graduated):
- curve_balance: ~13,333 SUI
- Virtual liquidity: 1,000 SUI
- Market Cap: 14,333 SUI ✅
```

**Why curve_balance + 1,000?**
- Your bonding curve starts with 1,000 SUI virtual market cap
- curve_balance = actual SUI locked in the curve from trades
- Virtual liquidity = the initial 1,000 SUI "floor"
- Total market cap = real SUI + virtual SUI

### **Fully Diluted Valuation (FDV):**
```
FDV = Current Price × Total Supply (1B)

Example:
- Price: 0.00001 SUI/token
- Total supply: 1,000,000,000 (1B)
- FDV: 0.00001 × 1B = 10,000 SUI ✅
```

---

## What We Track

### **Market Cap:**
```javascript
market_cap_sui = (curve_balance + 1000 SUI) 
```

This shows the actual market cap based on:
1. SUI locked in curve (curve_balance)
2. Virtual liquidity (1,000 SUI floor)

### **Fully Diluted Valuation (FDV):**
```javascript
fully_diluted_valuation_sui = current_price × 1_000_000_000
```

This shows: "What if all 1B tokens existed at current price?"

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
curve_balance:   0 SUI
Virtual Liq:     1,000 SUI

Market Cap:      1,000 SUI ✅ (0 + 1,000)
Progress:        0%
```

### **Token at 50% Progress:**

```
Tokens Sold:     368M / 737M (50%)
curve_balance:   ~6,666 SUI
Virtual Liq:     1,000 SUI
Current Price:   0.00001234 SUI/token

Market Cap:      7,666 SUI ✅ (6,666 + 1,000)
FDV:             12,340 SUI (0.00001234 × 1B)
MC/FDV Ratio:    62.1%
Progress:        50%
```

### **Token at 100% Progress (Graduated):**

```
Tokens Sold:     737M / 737M (100%)
curve_balance:   ~13,333 SUI
Virtual Liq:     1,000 SUI
Current Price:   0.00002000 SUI/token

Market Cap:      14,333 SUI ✅ (13,333 + 1,000)
FDV:             20,000 SUI (0.00002 × 1B)
MC/FDV Ratio:    71.7%
Status:          Graduated 🎓
```

---

## Why curve_balance + 1,000 SUI?

### **Bonding Curve with Virtual Liquidity:**

```
✅ CORRECT:
curve_balance: 6,666 SUI (real SUI locked)
Virtual Liq:   1,000 SUI (initial floor)
Market Cap:    7,666 SUI ✅
```

**Rationale:**
- Tokens START with 1,000 SUI virtual market cap
- As trades happen, real SUI accumulates in curve_balance
- Total market cap = real locked SUI + virtual liquidity
- Grows from 1,000 SUI → ~14,333 SUI at graduation
- Reflects TRUE value locked in the curve

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

### ✅ **Consistent Market Cap:**
All bonding curve tokens have same MC/FDV ratio (73.7%)

### ✅ **Fair Comparison:**
Easy to compare tokens at any progress level

### ✅ **Shows Max Curve Value:**
Market Cap = what the curve would be worth if completed

### ✅ **FDV Shows Total Potential:**
FDV = value if all 1B tokens existed

### ✅ **MC/FDV Ratio is Fixed:**
Always 73.7% for bonding curve tokens (737M / 1B)
- Shows that 73.7% of total supply is on the curve
- Remaining 26.3% = LP tokens + team + burned

---

## Metrics Summary

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Market Cap** | `price × 737M` | Max curve value at current price |
| **FDV** | `price × 1B` | Total value if all minted |
| **Current Price** | Latest trade | Price per token |
| **MC/FDV Ratio** | Always 73.7% | Fixed ratio (737M / 1B) |
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
// Get curve data
const curveBalance = parseFloat(tokenData.curve_balance); // SUI locked (in mist)
const virtualLiquidity = 1000 * 1_000_000_000; // 1,000 SUI in mist

// Market Cap = curve_balance + virtual liquidity
const marketCap = (curveBalance + virtualLiquidity) / 1_000_000_000; // Convert to SUI

// FDV = Price × Total Supply (1B)
const currentPrice = parseFloat(latestTrade.price_per_token);
const totalSupply = 1_000_000_000;
const fullyDilutedValuation = currentPrice * totalSupply;

// MC/FDV Ratio (varies based on progress)
const mcFdvRatio = (marketCap / fullyDilutedValuation) * 100;

// Progress to graduation
const curveSupply = parseFloat(tokenData.curve_supply);
const progress = (curveSupply / 737_000_000) * 100;
```

---

## Summary

**For bonding curve tokens with virtual liquidity:**
- ✅ Market Cap = curve_balance + 1,000 SUI
- ✅ FDV = Price × 1B (total supply)
- ✅ Starts at 1,000 SUI (0% progress)
- ✅ Grows to ~14,333 SUI (100% progress)

**This shows:**
- Real SUI locked + virtual liquidity ✅
- Starts at 1k SUI as intended ✅
- Grows with actual trading activity ✅
- Reflects true value in the curve ✅

**Market Cap = Real SUI + Virtual 1k SUI!** 📊
