# 🚨 CRITICAL BUG: Bonding Curve Supply Cap

**Discovered:** October 21, 2025  
**Severity:** CRITICAL  
**Status:** FIXED in v0.0.5

---

## 🔍 The Bug

**Location:** `bonding_curve.move` line 379

```move
// ❌ WRONG CODE (v0.0.3-0.0.4)
let s2_clamped = min_u64(s2_target, TOTAL_SUPPLY); // 1B

// ✅ FIXED CODE (v0.0.5)
let s2_clamped = min_u64(s2_target, MAX_CURVE_SUPPLY); // 737M
```

**Impact:** Bonding curve allowed selling ALL 1 billion tokens instead of stopping at 737 million.

---

## 📊 Evidence

**Test Transaction:** `76kuN7u8NaiN8cHZrnp6fW2hBwJ96pNMpbQsbBpf84LH`

| Metric | Expected | Actual | Issue |
|--------|----------|--------|-------|
| **Max tokens sellable** | 737,000,000 | 1,000,000,000 | ❌ 263M over! |
| **Remaining for buy** | 407,597,999 | N/A | Bought 670M instead |
| **Total cost** | ~13,000 SUILFG | ~32,465 SUILFG | ❌ 2.5x too high! |
| **Tokens for team/LP** | 263M reserved | 0 left | ❌ All sold! |

---

## 💰 Financial Impact

### What Should Happen (Correct):
1. Bonding curve sells: **737M tokens** for ~13K SUILFG
2. Reserved tokens:
   - Team: 2M
   - LP: 207M  
   - Burned: 54M
   - **Total:** 263M tokens

### What Actually Happened (Bug):
1. Bonding curve sold: **1B tokens** for ~32.5K SUILFG
2. Reserved tokens: **ZERO** ❌
3. No tokens left for LP creation!
4. Users paid 2.5x more due to continued price climb

---

## 🎯 Root Cause

**Design Intent:**
```
TOTAL_SUPPLY = 1B tokens
├─ Bonding Curve: 737M (73.7%)
├─ LP Pool: 207M (20.7%)
├─ Team: 2M (0.2%)  
└─ Burned: 54M (5.4%)
```

**Code Error:**
- Used `TOTAL_SUPPLY` (1B) as buy cap
- Should use `MAX_CURVE_SUPPLY` (737M)
- This consumed ALL tokens meant for LP/team/burn

---

## ✅ The Fix

**File:** `bonding_curve.move`  
**Line:** 379  
**Change:** 

```diff
- let s2_clamped = min_u64(s2_target, TOTAL_SUPPLY);
+ let s2_clamped = min_u64(s2_target, MAX_CURVE_SUPPLY);
```

**Version:** 0.0.3 → 0.0.5

---

## 🧪 Testing Results

### Before Fix (v0.0.4):
- ❌ Allowed buying 1B tokens
- ❌ Cost 32K SUILFG
- ❌ No tokens for LP

### After Fix (v0.0.5):
- ⏳ Need to retest with fresh memecoin
- ✅ Should stop at 737M
- ✅ Should cost ~13K SUILFG
- ✅ Should reserve 263M for LP/team/burn

---

## 📝 Discovered By

**User Observation:**
> "How did we buy the whole 1 billion tokens from the bonding curve, that is not supposed to be able to happen. Also, it's supposed to cost 13,000 Sui to finish all the tokens in the bonding curve, but somehow we spent over 30k Sui"

**Analysis:**
Human intuition caught what automated testing missed! 🧠

The user immediately recognized:
1. Wrong total supply sold
2. Wrong total cost
3. Exceeded theoretical limits

---

## 🔒 Prevention

**Why This Happened:**
- Supply constants are confusing (TOTAL_SUPPLY vs MAX_CURVE_SUPPLY)
- Easy to mix up when both are u64
- No runtime assertion to enforce curve < total

**Future Safeguards:**
1. ✅ Add assertion: `assert!(curve.token_supply <= MAX_CURVE_SUPPLY, E_SUPPLY_EXCEEDED)`
2. ✅ Better variable names (e.g., `MAX_BONDING_CURVE_SUPPLY`)
3. ✅ Test with expected cost validation
4. ✅ Add supply cap check in buy function

---

## 🎯 Lessons Learned

1. **Constants matter:** Variable names should be unambiguous
2. **User testing > Automated:** Human caught what code didn't
3. **Validate economics:** Check costs match theoretical calculations
4. **Always test limits:** Edge cases reveal bugs

---

**Status:** Fixed in v0.0.5, pending deployment and validation test.
