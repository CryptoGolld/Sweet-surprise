# 💰 Market Cap Calculation (Bonding Curve)

## The Right Way

**Market Cap** = Current Price × 737M (max bonding curve supply)  
**FDV** = Current Price × 1B (total supply)

---

## Formula

### **Market Cap:**
```
Market Cap = Current Price × 737M (max bonding curve supply)

Example:
- Price: 0.00001 SUI/token
- Max curve supply: 737,000,000
- Market Cap: 0.00001 × 737M = 7,370 SUI ✅
```

**Why 737M?**
- 737M is the max tokens that can be sold on the bonding curve
- This is the "circulating supply" for bonding curve phase
- Represents the market value at current price if curve completes

### **Fully Diluted Valuation (FDV):**
```
FDV = Current Price × Total Supply (1B)

Example:
- Price: 0.00001 SUI/token
- Total supply: 1,000,000,000 (1B)
- FDV: 0.00001 × 1B = 10,000 SUI ✅
```

**Why 1B?**
- 1B is the total token supply
- Includes: 737M curve + 207M Cetus LP + 2M team + 54M burned

---

## What We Track

### **Market Cap:**
```javascript
market_cap_sui = current_price × 737_000_000
```

This shows the market value if all bonding curve tokens existed at current price.

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

### **Token at 50% Progress:**

```
Tokens Sold:     368M / 737M (50%)
Current Price:   0.00001234 SUI/token

Market Cap:      9,094 SUI (0.00001234 × 737M) ✅
FDV:             12,340 SUI (0.00001234 × 1B)
MC/FDV Ratio:    73.7%
Progress:        50%
```

**Note:** Market Cap is ALWAYS price × 737M, regardless of progress.

### **Token at 100% Progress (Graduated):**

```
Tokens Sold:     737M / 737M (100%)
Current Price:   0.00002000 SUI/token

Market Cap:      14,740 SUI (0.00002 × 737M) ✅
FDV:             20,000 SUI (0.00002 × 1B)
MC/FDV Ratio:    73.7%
Status:          Graduated 🎓
```

---

## Why 737M for Market Cap?

### **737M = Bonding Curve "Circulating Supply":**

```
✅ CORRECT:
Price:         0.00001 SUI
Market Cap:    7,370 SUI (0.00001 × 737M)
FDV:           10,000 SUI (0.00001 × 1B)
MC/FDV:        73.7%
```

**Rationale:**
- 737M is the max that can be minted on the curve
- This is the "circulating supply" for bonding curve tokens
- Market Cap represents the value if curve completes
- Consistent across all tokens regardless of progress
- Easy comparison between tokens

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
// Get latest price
const currentPrice = parseFloat(latestTrade.price_per_token);

// Market Cap = Price × Max Bonding Curve Supply (737M)
const maxCurveSupply = 737_000_000;
const marketCap = currentPrice * maxCurveSupply;

// FDV = Price × Total Supply (1B)
const totalSupply = 1_000_000_000;
const fullyDilutedValuation = currentPrice * totalSupply;

// MC/FDV Ratio (always 73.7% for bonding curve tokens)
const mcFdvRatio = (marketCap / fullyDilutedValuation) * 100; // = 73.7%

// Progress to graduation (based on tokens actually sold)
const curveSupply = parseFloat(tokenData.curve_supply);
const progress = (curveSupply / maxCurveSupply) * 100;
```

---

## Summary

**For bonding curve tokens:**
- ✅ Market Cap = Price × 737M (max curve supply)
- ✅ FDV = Price × 1B (total supply)
- ✅ MC/FDV Ratio = Always 73.7% (fixed)

**This shows:**
- Consistent market cap calculation ✅
- Fair comparison between all tokens ✅
- Max value of bonding curve at current price ✅
- Total potential value (FDV) ✅

**Market Cap is always price × 737M, regardless of how many tokens are sold!** 📊
