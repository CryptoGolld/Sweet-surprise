# 💰 Market Cap Calculation (Bonding Curve)

## The Right Way for Bonding Curves

For bonding curve tokens, **Market Cap = SUI Reserve (curve_balance)**, NOT price × supply.

---

## Why?

### **Traditional Tokens:**
```
Market Cap = Price × Circulating Supply

Example:
- Price: $1
- Circulating: 1M tokens
- Market Cap: $1M ✅
```

### **Bonding Curve Tokens:**
```
Market Cap = SUI in Curve (curve_balance)

Example:
- Tokens sold: 500M (out of 737M)
- SUI reserve: 8,000 SUI
- Market Cap: 8,000 SUI ✅

NOT: price × 500M ❌
```

---

## How Our Bonding Curve Works

### **Formula:**
```
Price = base_price + (m × supply²)
```

The curve accumulates SUI as tokens are bought:
- Start: 0 SUI reserve → 0 Market Cap
- Mid: 5,000 SUI reserve → 5,000 SUI Market Cap
- Graduation: 13,333 SUI reserve → 13,333 SUI Market Cap

**The SUI reserve IS the market cap!**

---

## What We Track

### **Market Cap (curve_balance):**
```sql
market_cap_sui = curve_balance / 1_000_000_000  -- Convert mist to SUI
```

This is the **actual value locked** in the bonding curve.

### **Fully Diluted Valuation (FDV):**
```sql
fully_diluted_valuation_sui = current_price × 1_000_000_000
```

This is: "What if all 1B tokens existed at current price?"

### **Current Price:**
```sql
current_price_sui = latest_trade_price
```

Price of 1 token in SUI.

---

## Examples

### **Token at 50% Progress:**

```
Tokens Sold:     368M / 737M (50%)
SUI Reserve:     6,666 SUI
Current Price:   0.00001234 SUI/token

Market Cap:      6,666 SUI ✅
FDV:             12,340 SUI (0.00001234 × 1B)
Progress:        50%
```

**Why MC = 6,666 SUI?**
- That's the actual SUI locked in the curve
- If you wanted to "buy the project", you'd need to drain 6,666 SUI from the curve

### **Token at 100% Progress (Graduated):**

```
Tokens Sold:     737M / 737M (100%)
SUI Reserve:     13,333 SUI
Current Price:   0.00002000 SUI/token

Market Cap:      13,333 SUI ✅
FDV:             20,000 SUI (0.00002000 × 1B)
Status:          Graduated 🎓
```

---

## Comparison with Traditional MC

### **Why Not Use Price × Supply?**

```
❌ BAD (Traditional method):
Tokens Sold:  100M
Current Price: 0.00001 SUI
Market Cap:    1,000 SUI (0.00001 × 100M)

✅ GOOD (Bonding Curve method):
Tokens Sold:  100M
SUI Reserve:   2,500 SUI
Market Cap:    2,500 SUI
```

**The bonding curve method shows the TRUE value:**
- 2,500 SUI is actually locked
- That's what traders have put in
- That's the "liquidity" of the token

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

### ✅ **Accurate Value:**
Shows real SUI locked, not theoretical price × supply

### ✅ **Graduation Tracking:**
- 0 SUI → Just launched
- 6,666 SUI → 50% to graduation
- 13,333 SUI → Graduated! 🎓

### ✅ **Fair Comparison:**
- All tokens use same metric (SUI locked)
- Can compare tokens at different progress levels
- "Biggest" = most SUI accumulated

### ✅ **Matches User Intuition:**
"This token has 10k SUI locked" = Big
"This token has 100 SUI locked" = Small

---

## Metrics Summary

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Market Cap** | `curve_balance` | SUI locked in curve |
| **FDV** | `price × 1B` | If all tokens existed |
| **Current Price** | Latest trade | Price per token |
| **Progress** | `supply / 737M × 100` | % to graduation |
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
const curveBalance = parseFloat(tokenData.curve_balance); // In mist

// Market Cap = SUI Reserve
const marketCap = curveBalance / 1_000_000_000; // Convert to SUI

// FDV = Price × Total Supply
const fullyDilutedValuation = currentPrice * 1_000_000_000;

// Progress to graduation
const progress = (curveSupply / 737_000_000) * 100;
const graduationTarget = 13_333; // SUI
```

---

## Summary

**For bonding curve tokens:**
- ✅ Market Cap = SUI Reserve (curve_balance)
- ✅ FDV = Current Price × 1B tokens
- ✅ Progress = Supply / 737M × 100%

**This shows:**
- Real value locked ✅
- Fair comparison ✅
- Clear graduation path ✅
- Matches user expectations ✅

**NOT traditional price × supply!** That doesn't make sense for bonding curves.
