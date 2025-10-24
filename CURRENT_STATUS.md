# Current Status & Issues

## ✅ FIXED: Pagination Issue

### Problem
- Only showed latest 50 tokens on tokens page
- Portfolio couldn't display prices for older tokens

### Solution
Implemented pagination to fetch ALL tokens:
- Changed from single query (limit: 50) to paginated fetching
- Now fetches all bonding curves using `hasNextPage` and `nextCursor`
- Portfolio will now show prices for all tokens

**Status: FIXED** ✅

---

## ⚠️ PENDING: Sell Transaction Error

### Problem
```
MovePrimitiveRuntimeError at instruction 92 in command 1
```

### What We Know
- Error happens in the Move `sell` function at the `coin::split` operation
- "command 1" means the mergeCoins works, but the moveCall fails
- Instruction 92 is likely where Move tries to split/burn tokens

### Next Steps to Debug
1. You need to run the test script I created: `test-sell-transaction.ts`
2. Provide your burner seed phrase
3. The script will show exact values and pinpoint the issue

### How to Test
```bash
SEED_PHRASE="your twelve words here" \
CURVE_ID="0xYourCurveObjectId" \
COIN_TYPE="0xPackage::module::STRUCT" \
npx tsx test-sell-transaction.ts
```

**Status: NEEDS YOUR INPUT** ⚠️

---

## 📊 EXPLAINED: Charting Backend

### What You Need
An **Indexer + Time-Series Database** to store historical price data.

### Quick Summary
1. **Indexer** watches blockchain events (Buy/Sell trades)
2. **Database** stores price history (TimescaleDB recommended)
3. **API** serves chart data to frontend
4. **Chart Library** displays candles (TradingView Lightweight Charts)

### Files Created
- `CHARTING_BACKEND_GUIDE.md` - Full implementation guide
- Includes architecture, code examples, and recommendations

**Recommended Solution:**
- Custom Node.js indexer (full control)
- PostgreSQL + TimescaleDB ($5-20/month on Railway/Render)
- TradingView Lightweight Charts (free, professional)

**Status: DOCUMENTED** 📖

---

## Summary

| Issue | Status | Action Required |
|-------|--------|-----------------|
| Token pagination | ✅ Fixed | None - deploy when ready |
| Portfolio prices | ✅ Fixed | None - works with pagination fix |
| Sell transaction | ⚠️ Pending | Run test script with burner wallet |
| Charting backend | 📖 Documented | Read guide, decide on approach |

---

## What to Do Next

1. **Deploy pagination fix** - Will fix both token page and portfolio prices
2. **Debug sell issue** - Run the test script with your burner wallet
3. **Plan charting** - Review the guide and decide when to implement

Let me know when you're ready to test the sell transaction!
