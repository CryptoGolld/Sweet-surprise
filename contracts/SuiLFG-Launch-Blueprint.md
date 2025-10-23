# SuiLFG Launch — Bonding Curve Economics (FINAL)

## Tokenomics Summary

**Total Supply:** 1,000,000,000 (1B tokens)

**Distribution:**
- Bonding curve sales: 737,000,000 (73.7%) - sold to reach graduation
- Team allocation: 2,000,000 (0.2%) - paid at graduation
- Cetus pool: 207,000,000 (20.7%) - for liquidity
- **Burned (never minted):** 54,000,000 (5.4%) - deflationary!

**Total Circulating:** 946,000,000 (94.6%)

## Bonding Curve Formula

**Modified Quadratic with Base Price:**
```
Price: p(s) = base_price + (m_num/m_den) × s²

Where:
  base_price = 0.000001 SUI (1,000 mist)
  m_num = 1
  m_den = 10,593,721,631,205 (u128)
```

**Cost Integral (s1 to s2):**
```
cost = base_price×(s2-s1) + (m_num/3m_den)×(s2³-s1³)
```

**Note:** This is a cubic integral! Binary search is used for inverse calculation (no closed-form solution).

## Market Cap Journey

**Phase 1: Bonding Curve**
- Starting MC: 1,000 SUI (~$3,400)
- At Graduation: 38,525 SUI (~$131k)
- SUI raised: 13,333 SUI
- Tokens sold: 737,000,000
- Spot price: 0.000052273 SUI/token

**Phase 2: After Graduation (Cetus Pool)**
- LP SUI: 12,000 SUI (90% after platform cut)
- LP Tokens: 207,000,000
- Circulating: 739,000,000 (sold + team)
- Price: 0.000057971 SUI/token
- Market cap: 42,841 SUI (~$146k)

**Graduation Bump:** +11.2% 🚀

**Target MC:** 55,000 SUI (as trading continues)

## Token Economics at Graduation

**Token Distribution:**
- **Sold on Curve:** 737,000,000 tokens (73.7%)
- **Team Allocation:** 2,000,000 tokens (0.2%)
- **Cetus Pool:** 207,000,000 tokens (20.7%)
- **Burned (Never Minted):** 54,000,000 tokens (5.4%)
- **Total Circulating:** 946,000,000 tokens (94.6%)

**Cost Progression (Quadratic Incentive):**

The quadratic price formula creates exponentially increasing costs, strongly incentivizing early participation:

| Token Range | Total Cost | Per 100M Tokens |
|-------------|------------|-----------------|
| 0-100M | 131 SUI | 131 SUI |
| 100M-200M | 320 SUI | 320 SUI (2.4x more!) |
| 200M-300M | 610 SUI | 610 SUI (4.7x more!) |
| 600M-700M | 3,478 SUI | 3,478 SUI (26x more!) |

**Key Insight:** Later buyers pay dramatically more per token, creating strong early-mover advantage while ensuring fair price discovery.

## Key Features

✅ **1k SUI starting MC** - Lower entry barrier
✅ **Immediate price discovery** - Base price prevents "penny stock" perception  
✅ **Deflationary supply** - 54M tokens never minted (5.4% burn)
✅ **Optimal liquidity** - 207M tokens in Cetus pool
✅ **Small team allocation** - Only 2M (0.2%)
✅ **Positive graduation bump** - +11.2% price increase on LP seed
✅ **Quadratic cost curve** - Strong early buyer incentive with fair price discovery

## Constants (platform_config.move)

```move
const DEFAULT_M_NUM: u64 = 1;
const DEFAULT_M_DEN: u128 = 10593721631205;
const DEFAULT_BASE_PRICE_MIST: u64 = 1_000;  // 0.000001 SUI
const DEFAULT_GRADUATION_TARGET_MIST: u64 = 13_333 * 1_000_000_000;
const DEFAULT_TEAM_ALLOCATION_TOKENS: u64 = 2_000_000;
const DEFAULT_CETUS_BUMP_BPS: u64 = 1_000;  // 10% bump
```

## Constants (bonding_curve.move)

```move
const TOTAL_SUPPLY: u64 = 1_000_000_000;
const MAX_CURVE_SUPPLY: u64 = 737_000_000;
const CETUS_POOL_TOKENS: u64 = 207_000_000;
const TEAM_ALLOCATION: u64 = 2_000_000;
const BURNED_SUPPLY: u64 = 54_000_000;
```

## Fee Structure

**Trading Fees:**
- Platform fee: 2.5% (250 bps)
- Creator fee: 0.5% (50 bps)
- **Total:** 3%

**Graduation Fees:**
- Platform cut: 10% of SUI raised (1,333 SUI)
- Creator payout: 40 SUI (from platform's cut)
- LP SUI: 12,000 SUI (90%)

**First Buyer Fee:** 1 SUI (one-time)

## Implementation Status

✅ Type constraint fixed: `T: drop` (not `T: drop + store`)
✅ M_DEN corrected: 10,593,721,631,205
✅ Tokenomics: 737M/2M/207M/54M split
✅ Supply tracking: Proper accounting through all phases
✅ Graduation logic: Mints exactly 207M for Cetus pool
✅ Deflationary burn: 54M never minted

## Testing Checklist

- [ ] Deploy Cetus version to testnet
- [ ] Create test token
- [ ] Test buy (small amount)
- [ ] Test buy (larger amount)
- [ ] Test sell
- [ ] Test graduation trigger
- [ ] Test Cetus pool creation
- [ ] Verify token distribution (737M + 2M + 207M = 946M)
- [ ] Verify 54M tokens never minted
- [ ] Test LP fee collection

