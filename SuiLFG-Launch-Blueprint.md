# SuiLFG Launch — Final Master Blueprint (v5.0)

## 1. Vision & Mission
SuiLFG Launch is the official memecoin launchpad for the SuiLFG ecosystem. It blends the FOMO-driven virality of Pump.fun with robust security, transparent fees, and a clear graduation path to AMMs (Cetus). The platform is designed for longevity, with upgradable smart contracts that can be entrusted to a community DAO over time.

Goals:
- Make launching meme coins on Sui fast, safe, and thrilling
- Ensure sane default security measures and emergency controls
- Provide a fair fee model for platform and creators
- Enable a path to community ownership via DAO-controlled `UpgradeCap`
- **NEW (v5.0)**: Implement optimal bonding curve economics with 1k SUI starting market cap and immediate price discovery

## 2. Architecture & Upgradeability
- Modular Move package `suilfg_launch` containing:
  - `platform_config`: central configuration and admin control object
  - `ticker_registry`: ticker lifecycle, cooldowns, reservations, and auctions (future)
  - `bonding_curve`: the trading engine with a **modified quadratic** price curve featuring immediate price discovery, permissionless graduation, and optimal Cetus pool seeding with deflationary token burn
- Upgradability: The package is upgradable via Sui's `UpgradeCap`. Inits use one-time witness types per module, enabling safe initialization on publish and future upgrades without breaking invariants. The target governance plan transfers the `UpgradeCap` to a community DAO at maturity.

## 3. Smart Contract Modules

### 3.1 platform_config
Purpose: Central control plane for global parameters and emergency switches.

Shared Objects and Caps:
- `PlatformConfig` (shared):
  - `id: UID`
  - `treasury_address: address` — collects platform fees
  - `creation_is_paused: bool` — emergency switch to block new token creation
  - `first_buyer_fee_mist: u64` — fee charged to the first buyer (default: 1 SUI)
  - `default_platform_fee_bps: u64` — platform fee on trades (default: 450 = 4.5%)
  - `default_creator_fee_bps: u64` — creator fee on trades (default: 50 = 0.5%)
  - `graduation_reward_sui: u64` — reward paid to a token's creator on graduation
  - `default_m_num: u64`, `default_m_den: u128` — bonding curve coefficient (m = m_num/m_den, uses u128 for precision)
  - **NEW**: `default_base_price_mist: u64` — base price for 1k SUI starting market cap
  - **NEW**: `team_allocation_tokens: u64` — team allocation at graduation (default: 2M tokens = 0.2%)
- `AdminCap` (key, store): unique capability authorizing all admin updates
- `PLATFORM_CONFIG` (one-time witness): used for internal `init`

Admin Functions (require `&AdminCap`):
- `set_treasury_address(cfg, addr)`
- `pause_creation(cfg)` / `resume_creation(cfg)`
- `set_first_buyer_fee(cfg, fee_mist)`
- `set_platform_fee(cfg, fee_bps)`
- `set_creator_fee(cfg, fee_bps)`
- `set_graduation_reward(cfg, amount_sui)`
- `set_default_m(cfg, m_num, m_den)`
- `set_default_cetus_bump_bps(cfg, bump_bps)`
- **NEW**: `set_team_allocation(cfg, tokens)`

Notes:
- All getters are provided for off-chain apps/bots to read current parameters.
- Init flow: internal `init(PLATFORM_CONFIG, &mut TxContext)` shares config and transfers `AdminCap` to publisher.

### 3.2 ticker_registry
Purpose: Track ticker status across the platform with advanced ticker economy featuring cooldowns, fee-based early reuse, anti-squatting protection, and reservations.

#### Ticker Economy Overview
- **7-day maximum lock period** - prevents permanent ticker squatting
- **Graduated tokens** enter reusable state with exponential fee system
- **Fee doubling** - 33 → 66 → 132 → 264 → 528 → 666 SUI (capped)
- **Fee resets** after 7 days or when period expires
- **Lazy revocation** - automatic cleanup when ticker is claimed
- **Reserved tickers** for partners/brands with one-time use protection

Key Types:
- `TickerStatus` (enum): `Available`, `Active`, `OnCooldown`, `Banned`, `Reserved`, `Whitelisted`
- `TickerInfo` (store):
  - `status: TickerStatus`
  - `token_id: Option<ID>` — associated token object id
  - `cooldown_ends_ts_ms: u64` — when ticker becomes free
  - `whitelist: vector<address>` — whitelisted addresses
  - **NEW**: `creation_ts_ms: u64` — when current token was created
  - **NEW**: `graduated_ts_ms: u64` — when token graduated (0 if not)
  - **NEW**: `current_reuse_fee_mist: u64` — current fee to bypass cooldown
  - **NEW**: `reserved_for: Option<address>` — owner of reservation
- `TickerRegistry` (shared):
  - `id: UID`
  - `tickers: Table<String, TickerInfo>` — String keys
  - `default_cooldown_ms: u64` — default 7 days
- `Auction` (key, store) [stub for future iteration]:
  - `id: UID`, `ticker_symbol: String`, `highest_bidder: address`, `highest_bid: u64`, `end_ts_ms: u64`

#### Ticker Economy Flow

**Normal Flow:**
```
Day 0: Token created with $DOGE
Day 7: Token not graduated → Ticker FREE for anyone
```

**Fast Graduation Flow (Fee System):**
```
Day 0: Token 1 created, graduates → Fee: 33 SUI
Day 1: Token 2 created (paid 33), graduates → Fee: 66 SUI
Day 2: Token 3 created (paid 66), graduates → Fee: 132 SUI
Day 7: Period ends → Ticker FREE, fee resets to 33 SUI
```

**Hot Ticker Revenue:**
- Single ticker can generate: 33+66+132+264+528+666 = **1,689 SUI** per 7-day cycle
- Fee caps at 666 SUI to prevent absurdity
- All configurable by admin

Init:
- `init(TICKER_REGISTRY, &mut TxContext)` creates and shares `TickerRegistry` with default cooldown (7 days).

Admin Functions (require `&AdminCap`):
- `start_auction(registry, ticker, duration_ms, clock, ctx)` — stub for now
- `withdraw_reservation(registry, ticker)` — Reserved → Available
- `ban_ticker(registry, ticker)` — status → Banned
- `reserve_ticker(registry, ticker)` — status → Reserved (generic)
- **NEW**: `reserve_ticker_for(registry, ticker, address)` — Reserve for specific user
- `whitelist_ticker(registry, ticker, user)` — push to whitelist and mark Whitelisted
- `set_cooldown_period(registry, cooldown_ms)`
- **NEW**: `force_unlock_ticker(registry, ticker)` — Emergency ticker unlock

Public Helpers:
- `mark_active_with_lock(registry, ticker, token_id, creation_ts, cooldown_ends_ts)` — set Active and store lock metadata
- **NEW**: `mark_graduated(registry, ticker, graduated_ts, base_fee)` — Mark token as graduated, set up fee cooldown
- **NEW**: `is_ticker_claimable(registry, ticker, max_lock_ms, clock)` — Check if ticker can be claimed (lazy revocation)
- **NEW**: `get_current_reuse_fee(registry, ticker)` — Get current fee amount
- `contains(registry, &String) -> bool`

#### Anti-Squatting Protection
- **Maximum Lock**: 7 days - ticker auto-unlocks even if token still trading
- **Lazy Revocation**: When someone tries to claim ticker, contract checks if old token exceeded max lock
- **Admin Override**: Force unlock any ticker for scam/bundle situations
- **Reserved Protection**: Reserved tickers can only be used once by assigned address

#### Fee Economics
- **Base Fee**: 33 SUI (configurable)
- **Doubling Window**: 7 days (matches max lock period)
- **Fee Cap**: 666 SUI maximum (configurable)
- **Reset Triggers**: 7 days pass OR ticker becomes free
- **Revenue Potential**: Up to 1,689 SUI per hot ticker per cycle

### 3.3 bonding_curve
Purpose: Main trading engine for a token with a **modified quadratic** price curve featuring immediate price discovery (1k SUI starting market cap) and optimal Cetus pool seeding. Total supply is dynamic based on graduation economics with deflationary token burn (typically ~936M circulating tokens after graduation).

Constants & Types:
- `TOTAL_SUPPLY: u64 = 1_000_000_000`
- `TradingStatus` (enum): `Open`, `Frozen`, `WhitelistedExit`
- `BondingCurve<T: drop + store>` (key, store):
  - `id: UID`
  - `status: TradingStatus`
  - `sui_reserve: Balance<SUI>` — protocol reserve of SUI backing the curve
  - `token_supply: u64` — issued amount of the token so far
  - `platform_fee_bps: u64`, `creator_fee_bps: u64` — seeded from `PlatformConfig`
  - `creator: address`
  - `whitelist: vector<address>` — used for whitelisted exit
  - `m_num: u64`, `m_den: u128` — price coefficient ratio (m = m_num/m_den, u128 for high precision)
  - **NEW**: `base_price_mist: u64` — base price component ensuring 1k SUI starting market cap
  - `graduation_target_mist: u64` — threshold for permissionless graduation
  - `graduated: bool`, `lp_seeded: bool`, `reward_paid: bool` — step flags
- Uses `Coin<T>` directly (minted/burned via TreasuryCap)

Events:
- `Created { creator }`
- `Bought { buyer, amount_sui }`
- `Sold { seller, amount_sui }`
- `GraduationReady { creator, token_supply, spot_price_sui_approx }`
- `Graduated { creator, reward_sui, treasury }`

Core Logic:
- Creation:
  - No fee to create; uses network gas only
  - `create_new_meme_token<T>(cfg, ctx)` creates `BondingCurve<T>`, Open by default, copies default fee bps from `PlatformConfig`, `creator = sender`
  - Creator's optional auto-buy is done by calling `buy` in the same PTB right after creation
- Fees:
  - First buyer fee: if first-ever buy (supply == 0), pay `first_buyer_fee_mist` to `treasury_address`
  - Platform fee: bps of trade value routed to treasury
  - Creator fee: bps of trade value routed to creator
- First-Party Security Controls:
  - `freeze_trading<T>(&AdminCap, &mut BondingCurve<T>)`: set status → Frozen
  - `initiate_whitelisted_exit<T>(&AdminCap, &mut BondingCurve<T>)`: set status → WhitelistedExit; only whitelisted holders can sell
- Slippage + Deadline (front-run protection):
  - Buy requires `max_sui_in`, `min_tokens_out`, `deadline_ts_ms`
  - Sell requires `min_sui_out`, `deadline_ts_ms`

Bonding Curve Math (Modified Quadratic with Base Price):
- **NEW Price function**: `p(s) = base_price + m × s²` where `m = m_num/m_den` and `base_price = 0.000001 SUI`
- **Starting Market Cap**: 1B tokens × 0.000001 SUI = **1,000 SUI** (~$3,400 at $3.40/SUI)
- **Graduation Target**: ~13,333 SUI raised → ~55,000 SUI market cap
- **Integral Cost** for buy from s1 to s2: `cost = base_price×(s2-s1) + (m/3)×(s2³-s1³)`
- **Inverse calculation**: Binary search approach due to mixed linear/cubic equation (no closed-form solution)
  - Efficiently finds optimal token amount in ~30 iterations max
  - Gas cost is predictable and acceptable on Sui
- **Token Economics at Graduation**: 
  - Bonding curve sales: ~737M tokens (sold to reach graduation target)
  - Team allocation: 2M tokens (0.2% - goes to team wallet)
  - Cetus pool: ~197M tokens (optimized for 10% price bump above final curve price)
  - **Burned tokens**: ~64M tokens never minted (6.4% supply reduction - deflationary!)
  - **Total circulating**: ~936M tokens
- Implementation Details:
  - Uses u128 intermediates for safety; converts to u64 as needed
  - Rounds tokens_out down; clamps at `TOTAL_SUPPLY`; refunds residual SUI to caller
  - Binary search ensures exact calculations without closed-form formulas

Public Functions:
  - `create_new_meme_token<T>(cfg, ctx)` — creates the curve object using default m
  - `create_new_meme_token_with_m<T>(cfg, m_num, m_den, ctx)` — per-token override for m
  - `buy<T>(cfg, &mut curve, payment: Coin<SUI>, max_sui_in, min_tokens_out, deadline_ts_ms, &Clock, &mut TxContext)`
    - routes first-buyer/platform/creator fees, computes tokens_out via inverse integral, mints `Coin<T>` to buyer
  - `sell<T>(cfg, &mut curve, tokens: Coin<T>, amount_tokens, min_sui_out, deadline_ts_ms, &Clock, &mut TxContext)`
    - burns token coins, pays out SUI from reserve minus fees
  - `try_graduate<T>(cfg, &mut curve, &mut TxContext)` — checks if graduation target reached, freezes trading
  - `distribute_payouts<T>(cfg, &mut curve, &mut TxContext)` — distributes platform cut and creator payout
  - **UPDATED**: `seed_pool_prepare<T>(cfg, &mut curve, bump_bps, team_address, &mut TxContext)`
    - Mints team allocation first (with proper token supply accounting)
    - Calculates optimal tokens for Cetus pool with configurable price bump (default 10%)
    - Burns excess tokens by not minting them (deflationary mechanism)
    - Prepares SUI and tokens for Cetus pool seeding

Admin Functions:
- `freeze_trading<T>(&AdminCap, &mut curve)`
- `initiate_whitelisted_exit<T>(&AdminCap, &mut curve)`
- `add_to_whitelist<T>(&AdminCap, &mut curve, user)`
- `withdraw_reserve_to_treasury<T>(&AdminCap, cfg, &mut curve, amount_sui, ctx)` — emergency withdrawal
- `withdraw_reserve_to<T>(&AdminCap, &mut curve, to, amount_sui, ctx)` — emergency withdrawal to specific address

## 4. Off-Chain & Frontend
- IPFS Integration: Image upload and pinning for token icons/metadata
- Admin PTB Scripts: Full coverage for all admin functions and periodic tasks
- Creator UI: Token creation form with optional "Initial Creator Buy (SUI Amount)" and a clear note about the 1 SUI first-buyer fee
- Graduation Bot: Monitors for `GraduationReady` events, orchestrates graduation sequence (payouts + pool seeding)
- **NEW**: Team wallet management for receiving token allocations

### 4.1 Market Cap Display & Metrics

**Primary Metric: CIRCULATING MARKET CAP**
```
Circulating MC = minted_supply × spot_price
```
- Shows actual, tradeable value in the market
- Creates organic FOMO as it grows
- Industry standard (matches CEX/DEX displays)

**Secondary Metric: FULLY DILUTED MC**
```
Fully Diluted MC = 1,000,000,000 × spot_price
```
- Shows maximum potential if all tokens existed
- Provides transparency about tokenomics
- Standard practice (CoinGecko, CoinMarketCap show both)

#### Example Display at 300M Tokens Sold:
```
Current Price: 0.000009496 SUI
Minted Supply: 300,000,000 tokens

Circulating MC: 2,849 SUI (300M × 0.000009496)
Fully Diluted MC: 9,496 SUI (1B × 0.000009496)
Tokens Circulating: 300M / 1B (30%)
```

#### Recommended UI Layout:
```
┌────────────────────────────────────────────────────┐
│  🚀 TOKEN NAME ($SYMBOL)                           │
├────────────────────────────────────────────────────┤
│                                                     │
│  💰 Market Cap: 2,849 SUI  (~$9,687)              │ ← PRIMARY (large)
│     300M / 1B tokens (30% circulating)             │
│                                                     │
│  📊 Fully Diluted: 9,496 SUI                       │ ← SECONDARY (smaller)
│                                                     │
│  💵 Current Price: 0.000009496 SUI                 │
│  📈 24h Change: +45%                               │
│  💧 Liquidity: 1,150 SUI raised                    │
│  👥 Holders: 234                                   │
│                                                     │
│  Progress to Graduation:                           │
│  [████████░░░░░░░░░░░░░░░] 8.6%                   │
│  1,150 / 13,333 SUI                                │
│                                                     │
└────────────────────────────────────────────────────┘
```

#### Frontend Implementation:

**Smart Contract Functions to Use:**
```typescript
// Available view functions from bonding_curve module
minted_supply<T>(curve: &BondingCurve<T>) -> u64
spot_price_u64<T>(curve: &BondingCurve<T>) -> u64
// Access sui_reserve balance field for SUI raised
```

**TypeScript/JavaScript Implementation:**
```typescript
// 1. Fetch data from smart contract
const curveObject = await suiClient.getObject({
  id: curveId,
  options: { showContent: true }
});

const curveData = curveObject.data.content.fields;

// 2. Extract values
const mintedSupply = BigInt(curveData.token_supply);
const spotPriceMist = BigInt(curveData.spot_price); // from view function
const suiReserveMist = BigInt(curveData.sui_reserve);

// 3. Convert from mist to SUI (1 SUI = 10^9 mist)
const MIST_PER_SUI = 1_000_000_000n;
const priceInSui = Number(spotPriceMist) / Number(MIST_PER_SUI);
const suiRaised = Number(suiReserveMist) / Number(MIST_PER_SUI);

// 4. Calculate market caps
const tokensInBillions = Number(mintedSupply) / 1_000_000_000;
const circulatingMC = tokensInBillions * priceInSui;
const fullyDilutedMC = priceInSui; // 1B tokens × price

// 5. Calculate metrics
const graduationTarget = 13_333; // SUI
const progressPercent = (suiRaised / graduationTarget) * 100;
const circulatingPercent = (Number(mintedSupply) / 1_000_000_000) * 100;

// 6. Format for display
const displayMetrics = {
  // Primary metrics
  circulatingMC: `${circulatingMC.toLocaleString()} SUI`,
  circulatingMCUSD: `$${(circulatingMC * 3.40).toLocaleString()}`,
  
  // Secondary metrics
  fullyDilutedMC: `${fullyDilutedMC.toLocaleString()} SUI`,
  currentPrice: `${priceInSui.toFixed(9)} SUI`,
  
  // Progress metrics
  suiRaised: `${suiRaised.toLocaleString()} SUI`,
  progressPercent: `${progressPercent.toFixed(1)}%`,
  progressBar: progressPercent, // 0-100 for UI bar
  
  // Supply metrics
  mintedSupply: `${(Number(mintedSupply) / 1_000_000).toFixed(0)}M`,
  totalSupply: '1B',
  circulatingPercent: `${circulatingPercent.toFixed(1)}%`,
};

// 7. Display in UI
return (
  <div className="token-metrics">
    <h2>{displayMetrics.circulatingMC}</h2>
    <p className="text-sm text-gray-500">{displayMetrics.circulatingMCUSD}</p>
    <p className="text-xs">
      {displayMetrics.mintedSupply} / {displayMetrics.totalSupply} tokens 
      ({displayMetrics.circulatingPercent} circulating)
    </p>
    
    <div className="mt-4">
      <p className="text-sm">Fully Diluted: {displayMetrics.fullyDilutedMC}</p>
      <p className="text-sm">Current Price: {displayMetrics.currentPrice}</p>
      <p className="text-sm">Liquidity: {displayMetrics.suiRaised}</p>
    </div>
    
    <div className="mt-4">
      <p className="text-xs">Progress to Graduation</p>
      <ProgressBar value={displayMetrics.progressBar} />
      <p className="text-xs">{displayMetrics.progressPercent}</p>
    </div>
  </div>
);
```

#### Additional Metrics to Display:

**Essential Metrics:**
- SUI Raised: Total trading volume (creates FOMO)
- Progress to Graduation: Visual bar + percentage
- Current Price: Real-time spot price
- Circulating %: Transparency about token distribution

**Nice-to-Have Metrics:**
- 24h Volume: Shows trading activity
- 24h Price Change: Shows momentum (+/- %)
- Holder Count: Shows community size
- Buy/Sell Ratio: Shows sentiment
- Recent Transactions: Shows activity
- Time Since Launch: Shows age

#### Market Cap Progression Examples:

| Tokens Sold | Price (SUI) | Circulating MC | Fully Diluted MC | % to Grad |
|-------------|-------------|----------------|------------------|-----------|
| 0 | 0.000001 | 0 SUI | 1,000 SUI | 0% |
| 100M | 0.000002 | 194 SUI | 1,944 SUI | 1.0% |
| 300M | 0.000009 | 2,849 SUI | 9,496 SUI | 8.6% |
| 500M | 0.000025 | 12,299 SUI | 24,599 SUI | 33.2% |
| 737M | 0.000052 | 38,525 SUI | 52,273 SUI | 100% |
| Post-Grad | 0.000058 | 54,719 SUI | 58,000 SUI | Graduated |

**Key Insights:**
- Early stage: Low MC creates entry opportunity
- Mid stage: Growing MC shows traction
- Late stage: High MC near graduation creates urgency
- Post-graduation: Highest MC with DEX liquidity

#### Why This Matters:

**For Traders:**
- See real value vs potential
- Make informed entry decisions
- Track progress to graduation
- Understand tokenomics clearly

**For Platform:**
- Professional presentation
- Industry-standard metrics
- Transparent operations
- Creates trust with users

**Implementation Priority:**
1. **Must Have**: Circulating MC, price, progress bar
2. **Should Have**: Fully diluted MC, SUI raised, circulating %
3. **Nice to Have**: 24h volume, holder count, recent trades

### 4.2 Ticker Availability & Suggestions

**Real-time Ticker Check During Creation**

As users type ticker symbols, show instant availability and alternatives:

**Visual Experience:**
```
User types: "DOG"

┌────────────────────────────────────┐
│ Ticker Symbol:                     │
│ [DOG_____]                         │
│                                    │
│ 💡 Suggestions:                    │
│ ✅ DOGGY (Available - Free!)       │
│ ✅ DOGS (Available - Free!)        │
│ ✅ DOG2 (Available - Free!)        │
│ ❌ DOGE (Locked for 6d 12h)       │
│ ⚠️ DOGX (Claimable for 66 SUI)   │
└────────────────────────────────────┘

User types exact: "DOGE"

┌────────────────────────────────────┐
│ Ticker Symbol: [DOGE] ❌           │
│                                    │
│ ❌ DOGE is currently locked        │
│ Token: "Doge Killer"               │
│ Available in: 6 days 12 hours      │
│                                    │
│ 💡 Try these free alternatives:    │
│ ✅ DOGE2 → [Create Now]           │
│ ✅ DOGES → [Create Now]           │
│ ✅ DOGEX → [Create Now]           │
│                                    │
│ ⚠️ Or claim similar:               │
│ DOGY (66 SUI) → [Claim & Create]  │
└────────────────────────────────────┘
```

**Status Indicators:**
- ✅ **Green** = Available (free to use)
- ⚠️ **Orange** = Claimable (pay fee to use)
- ❌ **Red** = Locked (wait X days)
- 🔒 **Purple** = Reserved (admin only)
- ⛔ **Gray** = Banned (never usable)

**Implementation:**
```typescript
// Debounced API call as user types
const checkTicker = async (input: string) => {
  if (input.length < 2) return;
  
  const result = await fetch(`/api/ticker/check/${input}`);
  const data = await result.json();
  
  // data.exact = { status, available_in, claim_fee }
  // data.similar = [{ symbol, status, available_in }]
  
  return {
    exact: data.exact,
    available: data.similar.filter(t => t.status === 'Available'),
    claimable: data.similar.filter(t => t.status === 'Claimable'),
    locked: data.similar.filter(t => t.status === 'Locked'),
  };
};
```

**Benefits:**
- Prevents frustration (no trial-and-error)
- Shows alternatives instantly
- Displays claim fees upfront
- Professional UX
- Reduces support tickets

### 4.3 Search Categories & Token Display

**Two-Category Search Results:**

When users search for tickers, results split into:

**Category 1: 🎯 ACTIVE (Bonding Curve Tokens)**
- Sort: Newest first (creation time descending)
- Shows: Progress bar, time ago, quick buy
- These are current opportunities for early entry

**Category 2: 📜 OLD (Previous Ticker Versions)**
- Shows ONLY when searching specific ticker
- Displays tokens that previously used this ticker
- Allows bag holders to access old tokens for exit
- Hidden from normal browsing (only in search)

**Example Search for "$DOGE":**
```
┌─────────────────────────────────────┐
│ 🔍 Search: "DOGE"                   │
├─────────────────────────────────────┤
│ 🎯 ACTIVE                           │
│ ┌─────────────────────────────────┐ │
│ │ 🐕 DOGE 2.0    $DOGE  🆕 2h     │ │
│ │ MC: 15k  [████░] 65% to grad   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📜 OLD (Click to expand)            │
│ ┌─────────────────────────────────┐ │
│ │ 🐕 Original   Was: $DOGE  ✅    │ │
│ │ MC: 54k  Graduated 3d ago       │ │
│ │ ⚠️ Ticker reassigned            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Implementation:**
- Active tokens: Normal display
- Old tokens: Collapsed by default, "Was: $DOGE" label
- Exit liquidity: Old tokens allow sells but marked as deprecated
- Only shown in ticker-specific searches, hidden from main listings

## 5. Security & Risk Controls
- Global `creation_is_paused` big red button
- Per-curve `freeze_trading` and `WhitelistedExit` for controlled unwind
- Slippage + deadlines to mitigate MEV/sandwiches
- Clear events and status transitions for observability and recovery
- Token supply accounting properly tracks all mints (bonding curve sales + team allocation + LP seeding)

## 6. Parameters & Calibration

### 6.1 Updated Bonding Curve Economics (v5.0)
- **Starting Market Cap**: 1,000 SUI (~$3,400) - immediate price discovery
- **Graduation Target**: 13,333 SUI raised → ~55,000 SUI market cap  
- **Token Allocation**:
  - Bonding curve sales: 737M tokens (73.7% - to reach graduation)
  - Dev + Community allocation: 2M tokens (0.2% - paid at graduation)
  - Cetus pool: ~207M tokens (20.7% - optimized for 10% price bump)
  - Burned tokens: ~54M tokens never minted (deflationary - 5.4% supply reduction)
  - **Total circulating**: ~946M tokens (94.6%)

### 6.2 Technical Parameters
- **Modified Quadratic Formula**: `p(s) = 0.000001 + (1/10,593,721,631,205,675,237,376) × s²`
- **Base Price**: `default_base_price_mist = 1,000` (0.000001 SUI)
- **Curve Coefficient**: 
  - `m_num = 1` (u64)
  - `m_den = 10,593,721,631,205,675,237,376` (u128) - calculated to achieve 737M tokens @ 13,333 SUI
  - Note: m_den requires u128 as the value exceeds u64 maximum
- **Graduation Target**: `default_graduation_target_mist = 13,333 * 10⁹` (13,333 SUI in mist)
- **Cetus Integration**: `default_cetus_bump_bps = 1,000` (10% price bump)
- **Team Allocation**: `team_allocation_tokens = 2,000,000` (2M tokens = 0.2%)
- **Ticker Economy**:
  - `ticker_max_lock_ms = 7 days` (maximum ticker lock period)
  - `ticker_early_reuse_base_fee_mist = 33 SUI` (starting reuse fee)
  - `ticker_early_reuse_max_fee_mist = 666 SUI` (maximum fee cap)

### 6.3 Fee Parameters
- Defaults:
  - `first_buyer_fee_mist = 1_000_000_000` (1 SUI)
  - `default_platform_fee_bps = 450` (4.5%)
  - `default_creator_fee_bps = 50` (0.5%)
  - `graduation_reward_sui = 100 SUI` (unused, legacy parameter)
  - `default_cooldown_ms` = 7 days
  - `platform_cut_bps_on_graduation = 1000` (10% platform share at graduation)
  - `creator_graduation_payout_mist = 40 * 10⁹` (40 SUI paid from platform cut)
  - **Ticker Economy**:
    - `ticker_max_lock_ms = 7 days` (maximum ticker lock period)
    - `ticker_early_reuse_base_fee = 33 SUI` (starting reuse fee)
    - `ticker_early_reuse_max_fee = 666 SUI` (maximum fee cap)

## 7. Upgrade & Governance Plan
- Short-term: Team controls `UpgradeCap` and can deliver fixes/updates rapidly
- Medium-term: Introduce vote-guardrails with a multisig or timelock
- Long-term: Transfer `UpgradeCap` to a community DAO following traction and audits

## 8. Comparison with Pump.fun

| Feature | SuiLFG Launch (v5.0) | Pump.fun |
|---------|----------------------|----------|
| **Curve Type** | Modified Quadratic with Base | Linear |
| **Starting MC** | 1k SUI (~$3.4k) | ~$5-30k |
| **Graduation Target** | 13.3k SUI (~$45k) | 85 SOL (~$15-20k) |
| **Graduation MC** | ~55k SUI (~$187k) | ~$69k |
| **Team Allocation** | 0.2% (2M tokens) | 0% |
| **Total Fees** | 5% + 1 SUI first buyer | ~1.5-2% |
| **Token Burn** | Yes (6.4% supply reduction) | No |
| **Pool Bump** | 10% (configurable) | Variable |
| **Price Discovery** | Immediate (base price) | Starts near zero |
| **Price Calculation** | Binary search | Direct formula |

**Key Advantages:**
- Lower entry barrier (1k SUI vs $5-30k starting MC)
- Better liquidity at graduation (~$187k vs ~$69k)
- Deflationary supply (token burn creates scarcity)
- Immediate price discovery prevents "penny stock" perception
- Slightly higher fees justified by superior economics

## 9. Roadmap — Next Iterations
- Complete Auction mechanics for tickers (bid, outbid, finalize, claim)
- Strengthen math using thoroughly tested u128 helpers across the codebase
- Gas/size optimizations and event indexing for analytics
- Comprehensive Move tests; fuzzing around slippage, rounding and supply edges
- Tooling: SDK and TypeScript bindings; example PTBs and subgraph-like indexers
- Frontend integration for team allocation management
- Analytics dashboard for bonding curve performance tracking
- Gas benchmarking for binary search performance

## 10. Testing Strategy
- Unit tests: fee routing, first-buyer, slippage/deadline, freeze/whitelist
- Property tests: monotonic price, refunds correctness, supply clamp invariants
- Binary search tests: convergence, edge cases, gas costs
- Token accounting tests: verify supply tracking through all mint operations
- Scenario tests: launch + buys + sells + freeze + whitelisted exit + graduate + pool seed
- Off-chain tests: PTB scripts through a localnet/devnet with event assertions
- **NEW**: Deflationary burn verification (check unminted tokens match expected)

## 11. Deployment Checklist
- Confirm package edition = 2024 and compile against pinned Sui framework
- Publish and capture `UpgradeCap` securely
- Initialize `PLATFORM_CONFIG` and `TICKER_REGISTRY`
- Set initial parameters in `PlatformConfig` (verify graduation target = 13,333 SUI)
- Smoke test: Create a token, buy/sell, freeze, whitelist exit, graduate, seed pool
- Configure Graduation Bot with treasury signer
- Verify team wallet address for allocations
- Test complete graduation flow including team allocation and token burn

## 12. Audit Pointers
- Access control: ensure all admin paths require `&AdminCap`
- Math correctness: buy/sell integrals, inverse rounding, refunds/dust
- **NEW**: Binary search convergence and termination guarantees
- **NEW**: Token supply accounting integrity (all mints properly tracked)
- Shared object invariants: curve reserve cannot be drained without token burn
- Event coverage: ensure monitoring of all critical transitions
- Upgrade safety: witness inits idempotency; avoid storage layout traps
- Graduation can be permissionless: any caller can trigger once the curve reserve ≥ `graduation_target_mist`
- LP seeding and reward payment can be separate permissionless steps guarded by one-time flags
- **NEW**: Deflationary burn mechanism - verify excess tokens are never minted

## 13. Glossary
- `UpgradeCap`: the capability that allows package upgrades
- `Witness`: one-time module type used to gate internal init
- `PTB`: Programmable Transaction Block, Sui's composable multi-call TX
- `bps`: basis points, 1/100th of a percent
- `SUI`: native coin on Sui network
- `mist`: smallest unit of SUI (1 SUI = 10⁹ mist)
- **NEW**: `Binary Search`: numerical method to find token amounts when no closed-form solution exists
- **NEW**: `Deflationary Burn`: tokens that are never minted, permanently reducing circulating supply
