# 💰 Market Cap Calculation (Bonding Curve)

## The Right Way

**Market Cap** = Current Price × Bonding Curve Supply (tokens sold)  
**FDV** = Current Price × Total Supply (1B tokens)

---

## Formula

### **Market Cap:**
```
Market Cap = Current Price × Curve Supply

Example:
- Price: 0.00001 SUI/token
- Tokens sold: 500,000,000 (500M)
- Market Cap: 0.00001 × 500M = 5,000 SUI ✅
```

### **Fully Diluted Valuation (FDV):**
```
FDV = Current Price × Total Supply

Example:
- Price: 0.00001 SUI/token
- Total supply: 1,000,000,000 (1B)
- FDV: 0.00001 × 1B = 10,000 SUI ✅
```

---

## What We Track

### **Market Cap:**
```javascript
market_cap_sui = current_price × curve_supply
```

This shows the market value of tokens **currently in circulation** on the bonding curve.

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
Tokens Sold:     368,000,000 (368M / 737M)
Current Price:   0.00001234 SUI/token

Market Cap:      4,541 SUI (0.00001234 × 368M) ✅
FDV:             12,340 SUI (0.00001234 × 1B)
MC/FDV Ratio:    36.8% (shows how much is circulating)
Progress:        50%
```

### **Token at 100% Progress (Graduated):**

```
Tokens Sold:     737,000,000 (737M / 737M)
Current Price:   0.00002000 SUI/token

Market Cap:      14,740 SUI (0.00002000 × 737M) ✅
FDV:             20,000 SUI (0.00002000 × 1B)
MC/FDV Ratio:    73.7%
Status:          Graduated 🎓
```

---

## Why This Method?

### **Standard Across All Markets:**

```
✅ CORRECT (Standard method):
Tokens Sold:   500M
Current Price: 0.00001 SUI
Market Cap:    5,000 SUI (0.00001 × 500M)
FDV:           10,000 SUI (0.00001 × 1B)
```

**This is the standard way:**
- Used by CoinGecko, CoinMarketCap
- Easy to compare with other tokens
- Shows market value of circulating supply
- FDV shows potential max value

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

### ✅ **Industry Standard:**
Same as CoinGecko, CoinMarketCap, DexScreener

### ✅ **Fair Comparison:**
Can compare with any token on any platform

### ✅ **Shows Circulating Value:**
Market Cap = value of tokens actually in circulation

### ✅ **FDV Shows Potential:**
FDV = potential value if fully minted

### ✅ **MC/FDV Ratio:**
Shows how "diluted" the token is:
- 100% = All tokens minted (fully circulating)
- 50% = Half minted
- 10% = Highly diluted (low MC, high FDV)

---

## Metrics Summary

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Market Cap** | `price × curve_supply` | Value of circulating tokens |
| **FDV** | `price × 1B` | Value if all minted |
| **Current Price** | Latest trade | Price per token |
| **MC/FDV Ratio** | `MC / FDV × 100` | % of tokens circulating |
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
// Get latest price and supply
const currentPrice = parseFloat(latestTrade.price_per_token);
const curveSupply = parseFloat(tokenData.curve_supply); // Tokens sold

// Market Cap = Price × Circulating Supply
const marketCap = currentPrice * curveSupply;

// FDV = Price × Total Supply
const totalSupply = 1_000_000_000;
const fullyDilutedValuation = currentPrice * totalSupply;

// MC/FDV Ratio
const mcFdvRatio = (marketCap / fullyDilutedValuation) * 100;

// Progress to graduation
const progress = (curveSupply / 737_000_000) * 100;
```

---

## Summary

**For bonding curve tokens:**
- ✅ Market Cap = Price × Curve Supply (tokens sold)
- ✅ FDV = Price × Total Supply (1B)
- ✅ MC/FDV Ratio = Shows circulation %

**This shows:**
- Standard industry metric ✅
- Easy comparison ✅
- Market value of circulating supply ✅
- Potential max value (FDV) ✅

**Same method as CoinGecko, CMC, and all major platforms!** 📊
