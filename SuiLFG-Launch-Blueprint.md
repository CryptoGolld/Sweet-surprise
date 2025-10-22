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
  - Team allocation: 2M tokens (0.2% - 1M dev + 1M community, paid at graduation)
  - Cetus pool: ~207M tokens (20.7% - optimized for 10% price bump above final curve price)
  - **Burned tokens**: ~54M tokens never minted (5.4% supply reduction - deflationary!)
  - **Total circulating**: ~946M tokens (94.6%)
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

### Bot Infrastructure

**Graduation Bot (Optional for Better UX):**

**What it does:** Monitors blockchain and calls graduation functions automatically

**Bot Code Example:**
```javascript
// Simple graduation bot (runs on EC2 with your backend)
const { SuiClient } = require('@mysten/sui.js');

const CETUS_GLOBAL_CONFIG = '0xCETUS_CONFIG_ID'; // Get from Cetus docs
const PLATFORM_CONFIG = '0xYOUR_PLATFORM_CONFIG_ID';
const GRADUATION_TARGET = 13_333_000_000_000; // 13,333 SUI in mist

async function graduationBot() {
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
  
  while (true) {
    // Get tokens near graduation from your Supabase
    const tokens = await supabase
      .from('tokens')
      .select('*')
      .gte('sui_reserve', GRADUATION_TARGET)
      .eq('graduated', false);
    
    for (const token of tokens) {
      try {
        // Step 1: Mark as graduated
        await wallet.signAndExecuteTransactionBlock({
          transactionBlock: {
            moveCall: {
              target: `${PACKAGE_ID}::bonding_curve::try_graduate`,
              typeArguments: [token.coin_type],
              arguments: [PLATFORM_CONFIG, token.curve_id]
            }
          }
        });
        
        // Step 2: Distribute payouts
        await wallet.signAndExecuteTransactionBlock({
          transactionBlock: {
            moveCall: {
              target: `${PACKAGE_ID}::bonding_curve::distribute_payouts`,
              typeArguments: [token.coin_type],
              arguments: [PLATFORM_CONFIG, token.curve_id]
            }
          }
        });
        
        // Step 3: Create Cetus pool with 100-year lock (AUTOMATIC!)
        await wallet.signAndExecuteTransactionBlock({
          transactionBlock: {
            moveCall: {
              target: `${PACKAGE_ID}::bonding_curve::seed_pool_and_create_cetus_with_lock`,
              typeArguments: [token.coin_type],
              arguments: [
                PLATFORM_CONFIG,
                token.curve_id,
                CETUS_GLOBAL_CONFIG,  // Cetus protocol config
                0,                     // bump_bps (0 = no price bump)
                -443636,              // tick_lower (full range)
                443636,               // tick_upper (full range)
                '0x6'                 // Clock object (shared)
              ]
            }
          }
        });
        
        console.log(`✅ Token ${token.ticker} graduated!`);
      } catch (err) {
        console.error(`Failed to graduate ${token.ticker}:`, err);
      }
    }
    
    await sleep(10000); // Check every 10 seconds
  }
}
```

**What is CETUS_GLOBAL_CONFIG?**
- It's Cetus protocol's shared configuration object
- Contains pool factory, fee tiers, protocol settings
- It's a **shared object on Sui** (not hardcoded because it's not ours!)
- Get the object ID from [Cetus docs](https://cetus-1.gitbook.io/cetus-docs)
  - Testnet: Check Cetus documentation
  - Mainnet: Check Cetus documentation
- You pass it when calling `seed_pool_and_create_cetus_with_lock()`

**Why not hardcoded?**
- It's Cetus's object, not ours (we don't control the ID)
- Different on testnet vs mainnet
- Cetus might upgrade it
- Better to pass as parameter (flexibility)

**Alternative to Bot:**
- Add "Graduate" button in UI (users click it manually)
- Functions are permissionless - anyone can call them
- Bot just provides instant UX

**Cost:** $0 (runs with your backend) + ~0.03 SUI gas per graduation

**Compilation Bot (NOT NEEDED):**
- No 24/7 compilation service required
- Sui uses generic type parameters `<T>` - one contract handles all tokens
- Users publish small coin modules via wallet (browser-based)
- Optional: Provide web compilation service for convenience
- Template packages can simplify user flow

### Backend Infrastructure & Deployment

**Complete Infrastructure Stack:**

**Backend Server (Ubuntu EC2):**
- **Recommendation**: Start with t2.micro (FREE tier, 1GB RAM) or t3.small (2GB RAM, $15/month)
- **Hosts all backend services:**
  - Compilation API (Node.js/Express) - Compiles user coin modules on-demand
  - Indexer (Node.js) - Listens to blockchain events, updates Supabase
  - Graduation Bot (Node.js) - Monitors and triggers graduations
- **Management**: PM2 process manager for auto-restart and monitoring
- **Requirements**: Sui CLI installed for compilation

**Database (Supabase):**
- **Tier**: FREE tier (500 MB) sufficient for launch
- **Purpose**: Store token metadata, user data, analytics
- **Tables**: tokens, users, transactions, comments, referrals, moon_race_rankings
- **Cost**: $0/month initially, $25/month if exceed free tier

**IPFS Storage (Images):**
- **Recommendation**: NFT.Storage (unlimited, FREE forever) or Pinata free tier (1GB, 100GB bandwidth)
- **Purpose**: Store token images/logos
- **Cost**: $0/month initially, $20/month Pinata paid if need reliability

**Frontend Hosting:**
- **Recommendation**: Vercel or Netlify (FREE tier)
- **Framework**: Next.js 14
- **Cost**: $0/month

**Total Launch Cost: $0/month** (all free tiers!) 🎉

**Growth Cost (after 12 months):**
- EC2: $15/month (t3.small)
- Supabase: $0-25/month
- IPFS: $0-20/month
- **Total: $15-60/month** (covered by 1-2 graduations!)

### Cetus Integration & LP Management

**✅ FULLY IMPLEMENTED:**
- `seed_pool_and_create_cetus_with_lock()` automatically creates Cetus pool upon graduation
- Contract directly calls Cetus CLMM (no manual work!)
- Adds liquidity with **100-year lock** (maximum trust!)
- LP Position NFT sent to `lp_recipient_address` (configurable)
- Fully on-chain, permissionless graduation

**How It Works:**
```
Token reaches 13,333 SUI in reserve
  ↓
Anyone calls graduation functions
  ↓
distribute_payouts():
  - Platform takes 1,333 SUI (10%)
    ├─ Pays creator 40 SUI (from this cut)
    └─ Keeps 1,293 SUI net
  - Reserve now has 12,000 SUI
  ↓
seed_pool_prepare():
  - Mints 2M team tokens → treasury_address
  - Creates Cetus pool with 207M tokens + 12,000 SUI (90% of reserve)
  - Locks LP for 100 years (can't be unlocked!)
  - Sends LP Position NFT → lp_recipient_address
  - Pool goes live instantly!
```

**100-Year LP Lock Benefits:**
```
✅ Liquidity locked forever (can't rug pull)
✅ Platform still earns 0.3% LP fees (both SUI + tokens)
✅ Maximum user trust ("locked in code")
✅ Fees collectible anytime via permissionless function
✅ Same revenue, more trust
```

**LP Fee Collection:**
```move
public entry fun collect_lp_fees<T>(
    lp_position: &mut Position,
    pool: &mut CetusPool,
    ctx: &mut TxContext
) {
    // Collect accumulated fees (0.3% of all trades)
    let (sui_fees, token_fees) = cetus::collect_fees(pool, lp_position);
    
    // Send to platform (anyone can trigger this!)
    let recipient = get_lp_recipient_address(cfg);
    transfer::public_transfer(sui_fees, recipient);
    transfer::public_transfer(token_fees, recipient);
}
```

**Revenue from LP Fees:**
- Token doing 10k SUI/day volume → 30 SUI/day in LP fees
- 20 graduated tokens → 600 SUI/day (~$2,040/day)
- Passive income forever, even with locked LP!

**LP Recipient Configuration:**
- Configurable via `set_lp_recipient_address(admin, cfg, address)`
- Can be: Main treasury, separate vault, multi-sig, or DAO
- Receives LP Position NFT and can collect fees
- Cannot withdraw liquidity if using 100-year lock (builds trust)

### Token Creation Flow

**Technical Implementation:**

Sui uses generic type parameters - users must publish a coin module to get `TreasuryCap<T>`, then pass it to the bonding curve contract.

**User Flow:**
1. User fills creation form (name, ticker, description, image, socials)
2. Frontend calls Compilation API: `POST /api/compile-token`
3. API generates Move code from template and compiles using Sui CLI
4. Returns compiled bytecode to frontend
5. User approves wallet transaction #1: Publish coin package → receives TreasuryCap
6. User approves wallet transaction #2: Create bonding curve with TreasuryCap
7. Metadata saved to Supabase (name, ticker, image, socials, description)
8. Token is live and tradeable!

**Compilation API Example:**
```javascript
// Generates and compiles coin module on-demand
POST /api/compile-token
Body: { name, ticker, symbol, description }

// API creates Move package structure with SuiLFG signature
// Description automatically appended with: " | Launched on SuiLFG.com"
// Calls: sui move build --path /tmp/package
// Returns: Compiled bytecode

Response: { 
  success: true, 
  modules: [...], 
  dependencies: ['0x1', '0x2'] 
}
```

**Platform Signature:**
All tokens launched through SuiLFG automatically include platform signature in coin metadata:
- Description format: `{user_description} | Launched on SuiLFG.com`
- Icon URL includes SuiLFG watermark (optional)
- Coin metadata frozen with platform attribution
- Similar to Pump.fun's "@pump" identifier
- Builds brand recognition across ecosystem
- Users can verify token launched via official platform

**Note**: This is a web service API (on-demand), NOT a 24/7 background bot. The API only runs when users request compilation.

### Price API for Wallet Integration

**Purpose**: Enable wallets (Suish, Sui Wallet, Suiet) to display token prices and values for bonding curve tokens

**Problem**: Wallets can't automatically read prices from custom bonding curve contracts - tokens show with no value

**Solution**: Public Price API that wallets can integrate

**API Endpoints:**
```
GET /api/v1/token/{coin_type}/price
GET /api/v1/token/{coin_type}/metadata
GET /api/v1/tokens/list (all tokens with prices)
```

**Example Response:**
```json
{
  "symbol": "DOGE",
  "name": "Doge Killer",
  "coin_type": "0x123::doge::DOGE",
  "price_sui": 0.000052,
  "price_usd": 0.000177,
  "market_cap_sui": 38525,
  "volume_24h_sui": 2345,
  "status": "bonding",
  "platform": "suilfg",
  "logo_url": "ipfs://...",
  "launched_at": "2024-10-12T00:00:00Z"
}
```

**Implementation:**
```javascript
// Add to EC2 backend
app.get('/api/v1/token/:coinType/price', async (req, res) => {
  const token = await supabase
    .from('tokens')
    .select('*')
    .eq('coin_type', req.params.coinType)
    .single();
  
  // Get real-time price
  const price = token.status === 'bonding' 
    ? await getBondingCurvePrice(token.curve_id)
    : await getCetusPrice(token.pool_id);
  
  res.json({
    symbol: token.ticker,
    price_sui: price,
    price_usd: price * getCurrentSuiPrice(),
    // ... other fields
  });
});
```

**Wallet Integration Process:**
1. Build and document public API
2. Contact wallet teams (Suish, Sui Wallet, Suiet, Ethos)
3. Provide API documentation and examples
4. Wallets integrate and display prices
5. Users see token values in their wallets

**Timeline:**
- Launch: Prices on your website only
- Week 2-4: First wallet integrations
- Month 2+: Full wallet support

**Benefits:**
- ✅ Better UX (users see value in wallet)
- ✅ More professional
- ✅ Increased legitimacy
- ✅ Standard practice (Pump.fun does this)

**Note**: Post-graduation tokens automatically show prices (Cetus API, DEXScreener). This API is primarily for bonding curve phase.

### Other Infrastructure
- IPFS Integration: Image upload and pinning for token icons/metadata
- Admin PTB Scripts: Full coverage for all admin functions and periodic tasks
- Creator UI: Token creation form with optional "Initial Creator Buy (SUI Amount)" and a clear note about the 1 SUI first-buyer fee
- **NEW**: Team wallet management for receiving dev (1M) + community (1M) token allocations

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
- Always visible when searching

**Category 2: ✅ GRADUATED (Successfully Graduated Tokens)**
- Sort: Market cap (highest first)
- Shows: Market cap, 24h volume, liquidity
- Successfully graduated tokens still trading on Cetus
- **Expanded by default** - showcase success stories!
- Integrated Cetus trading via platform (1% interface fee)

**Category 3: 📜 OLD (Ticker Revoked/Lost)**
- Shows ONLY when searching specific ticker
- Displays tokens that lost their ticker (failed/exceeded max lock)
- **Collapsed by default** - only for bag holder exits
- Marked as "Was: $DOGE" with warning badge
- Exit liquidity only (deprecated)

**Example Search for "$DOGE":**
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Search: "DOGE"                                       │
├─────────────────────────────────────────────────────────┤
│ 🎯 ACTIVE (Bonding Curve)                               │
│ ┌──────────────────────────────────────────────────┐   │
│ │ 🐕 DOGE 3.0      $DOGE      🆕 2h ago            │   │
│ │ MC: 15,234 SUI  •  [████░] 65% to graduation    │   │
│ │ [View] [Quick Buy]                               │   │
│ └──────────────────────────────────────────────────┘   │
│                                                          │
│ 📜 OLD (Ticker Revoked) [Show 1 old version ▼]         │
│ ^ Collapsed - sits ABOVE graduated for visibility       │
│                                                          │
│ ✅ GRADUATED (On Cetus DEX) - EXPANDED                  │
│ ┌──────────────────────────────────────────────────┐   │
│ │ 🐕 DOGE 2.0      $DOGE      ✅ Graduated         │   │
│ │ MC: 54,719 SUI  •  24h Vol: 3,456 SUI           │   │
│ │ Liquidity: 12k SUI  •  Graduated 3 days ago     │   │
│ │ [View] [Trade via Cetus]                         │   │
│ ├──────────────────────────────────────────────────┤   │
│ │ 🐶 DOGE 1.0      $DOGE      ✅ Graduated         │   │
│ │ MC: 48,234 SUI  •  Graduated 1 week ago         │   │
│ │ [View] [Trade via Cetus]                         │   │
│ ├──────────────────────────────────────────────────┤   │
│ │ [More graduated tokens if exist...]              │   │
│ └──────────────────────────────────────────────────┘   │
│ ^ Expanded - showcases success but below OLD for UX     │
└─────────────────────────────────────────────────────────┘
```

**Display Rules:**
- **ACTIVE**: Always visible first - current opportunity
- **OLD**: Second, collapsed - visible but minimal space
- **GRADUATED**: Third, expanded - showcase success with full details
- Non-search browsing: Only show ACTIVE and GRADUATED (hide OLD entirely)

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
  - Bonding curve sales: 737M tokens (73.7% - sold to reach graduation)
  - Team allocation: 2M tokens (0.2% - 1M dev + 1M community, paid at graduation)
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
- **LP Management**:
  - `lp_recipient_address` - wallet that receives LP Position NFTs (configurable)

### 6.3 Fee Parameters
- Defaults:
  - `first_buyer_fee_mist = 1_000_000_000` (1 SUI)
  - `default_platform_fee_bps = 250` (2.5%)
  - `default_creator_fee_bps = 50` (0.5%)
  - **Total trading fee: 3%** (competitive with major platforms)
  - `graduation_reward_sui = 100 SUI` (unused, legacy parameter)
  - `default_cooldown_ms` = 7 days
  - `platform_cut_bps_on_graduation = 1000` (10% platform share at graduation)
  - `creator_graduation_payout_mist = 40 * 10⁹` (40 SUI paid FROM platform's cut, not reserve)
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
| **Total Fees** | 3% + 1 SUI first buyer | ~1.5-2% |
| **Token Burn** | Yes (5.4% supply reduction) | No |
| **Pool Bump** | 10% (configurable) | Variable |
| **Price Discovery** | Immediate (base price) | Starts near zero |
| **Price Calculation** | Binary search | Direct formula |

**Key Advantages:**
- Lower entry barrier (1k SUI vs $5-30k starting MC)
- Better liquidity at graduation (~$187k vs ~$69k)
- Deflationary supply (token burn creates scarcity)
- Immediate price discovery prevents "penny stock" perception
- Slightly higher fees justified by superior economics

## 9. Cetus Integration - Automatic Pool Creation with 100-Year Lock

### Overview
✅ **FULLY IMPLEMENTED** - The smart contract directly creates Cetus pools with 100-year locks upon graduation.

### What's Implemented

**1. Cetus Dependency Added** ✅
```toml
# Move.toml
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
Cetus = { git = "https://github.com/CetusProtocol/cetus-clmm-sui.git", subdir = "sui", rev = "main" }
```

**2. Cetus Imports Added** ✅
```move
// bonding_curve.move
use cetus_clmm::config::GlobalConfig;
use cetus_clmm::pool::{Self as cetus_pool, Pool};
use cetus_clmm::position::{Self as cetus_position, Position};
```

**3. Full Implementation** ✅
See `bonding_curve.move` for full implementation. Key features:

- **Automatic pool creation**: Creates Cetus CLMM pool directly from contract
- **100-year lock**: Lock duration = 3,153,600,000,000 ms (100 years!)
- **Configurable recipient**: LP Position NFT sent to `lp_recipient_address`
- **Fee collection**: Platform earns 0.3% LP fees forever via `collect_lp_fees()`
- **Permissionless**: Anyone can trigger graduation and pool creation
- **Full range liquidity**: Typically uses full price range for maximum liquidity

**Key Functions:**
```move
// Main graduation function - creates pool with 100-year lock
public entry fun seed_pool_and_create_cetus_with_lock<T>(...)

// Permissionless fee collection - anyone can trigger
public entry fun collect_lp_fees<T>(...)
```

**5. Graduation Bot Updated** ✅
- Calls `seed_pool_and_create_cetus_with_lock()` for full automation
- Optionally calls `collect_lp_fees()` periodically (weekly) to claim accumulated 0.3% LP fees
- Fully automated end-to-end!

### Benefits of This Implementation

**For Platform:**
- ✅ Fully decentralized (no manual pool creation) 
- ✅ Permissionless (anyone can call graduation functions)
- ✅ Zero manual operations (everything on-chain)
- ✅ Ongoing LP fee revenue (0.3% of volume forever)
- ✅ Professional infrastructure

**For Users:**
- ✅ Maximum trust (liquidity locked 100 years)
- ✅ Transparent (lock verifiable on-chain)
- ✅ Permanent liquidity guaranteed
- ✅ No rug pull risk
- ✅ Higher confidence in platform

**Revenue Impact:**
- Graduation fees: 1,293 SUI per token (unchanged)
- Interface fees: 1% of post-grad volume (unchanged)
- **NEW**: LP fees: 0.3% of post-grad volume (passive income!)
- **Total**: 1.3% of all Cetus volume forever

### LP Position Management

**What LP Recipient Gets:**
1. **One Position NFT per graduated token** - proof of liquidity ownership
2. **Locked for 100 years** - can't withdraw, builds trust
3. **Can collect fees anytime** - 0.3% of all trades in SUI + tokens
4. **Fees in both assets** - proportional to buy/sell direction

**Example Fee Collection:**
- Pool does 10k SUI volume/day
- Fees: 30 SUI + ~$DOGE tokens daily
- Weekly collection: ~210 SUI + tokens
- Annual from one token: ~10,950 SUI (~$37k)

**Fee Collection Strategy:**
- Manual: Call collect_lp_fees() weekly via admin
- Automated: Bot calls it daily
- Permissionless: Any user can trigger, fees still go to LP recipient

## 14. Roadmap — Next Iterations
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

## 11. Security Notes

**Critical Security Design:**
All graduation functions are **permissionless** (anyone can call), but **all fund destinations come from config**:

```move
// ✅ SECURE: Team allocation
let team_recipient = platform_config::get_treasury_address(cfg);
transfer::public_transfer(team_tokens, team_recipient);

// ✅ SECURE: LP Position NFT
let lp_recipient = platform_config::get_lp_recipient_address(cfg);
transfer::public_transfer(position_nft, lp_recipient);
```

**Why this is secure:**
- All recipients read from `PlatformConfig`
- `PlatformConfig` controlled by `AdminCap`
- Only you have `AdminCap`
- Attackers can trigger functions, but **cannot steal funds**

**Why permissionless is good:**
- Decentralized (no single point of failure)
- Resilient (even if your bot fails, community can help)
- Trustless (anyone can verify and trigger)
- Simple (no complex access control)

## 12. Deployment Checklist
- Confirm package edition = 2024 and compile against pinned Sui framework
- Publish and capture `UpgradeCap` securely
- Initialize `PLATFORM_CONFIG` and `TICKER_REGISTRY`
- **CRITICAL**: Set `treasury_address` (receives team allocations)
- **CRITICAL**: Set `lp_recipient_address` (receives LP NFT and fees)
- Set initial parameters in `PlatformConfig` (verify graduation target = 13,333 SUI)
- Get Cetus GlobalConfig object ID from Cetus documentation
- Smoke test: Create a token, buy/sell, freeze, whitelist exit, graduate, seed pool
- Test complete graduation flow including team allocation and token burn
- Verify team tokens go to treasury_address (not attacker address!)
- Verify LP NFT goes to lp_recipient_address

## 13. Audit Pointers
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
