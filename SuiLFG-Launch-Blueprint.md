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
Purpose: Track ticker status across the platform. Enforce cooldowns, support reservations, whitelisting, bans, and auctions (future), and provide a path for the auction winner to claim a ticker after cooldown expires.

Key Types:
- `TickerStatus` (enum): `Available`, `Active`, `OnCooldown`, `Banned`, `Reserved`, `Whitelisted`
- `TickerInfo` (store):
  - `status: TickerStatus`
  - `token_id: Option<ID>` — associated token object id (or analogous identifier)
  - `cooldown_ends_ts_ms: u64`
  - `whitelist: vector<address>`
- `TickerRegistry` (shared):
  - `id: UID`
  - `tickers: Table<String, TickerInfo>` — String keys
  - `default_cooldown_ms: u64` — default 30 days
- `Auction` (key, store) [stub for future iteration]:
  - `id: UID`, `ticker_symbol: String`, `highest_bidder: address`, `highest_bid: u64`, `end_ts_ms: u64`

Init:
- `init(TICKER_REGISTRY, &mut TxContext)` creates and shares `TickerRegistry` with default cooldown (30 days).

Admin Functions (require `&AdminCap`):
- `start_auction(registry, ticker, duration_ms, clock, ctx)` — stub for now
- `withdraw_reservation(registry, ticker)` — Reserved → Available
- `ban_ticker(registry, ticker)` — status → Banned
- `reserve_ticker(registry, ticker)` — status → Reserved
- `whitelist_ticker(registry, ticker, user)` — push to whitelist and mark Whitelisted
- `set_cooldown_period(registry, cooldown_ms)`

Public Helpers:
- `mark_active_with_lock(registry, ticker, token_id, cooldown_ends_ts_ms)` — set Active and store lock metadata
- `contains(registry, &String) -> bool`

Future Work (Auctions):
- Bidding process, outbid refunds (escrow), finalization at `end_ts_ms`
- Post-cooldown claim path for the winner to reserve/activate the ticker

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
  - Team allocation: 2M tokens (0.2% - paid at graduation to team wallet)
  - Cetus pool: ~218M tokens (21.8% - optimized for 10% price bump)
  - Burned tokens: ~43M tokens never minted (deflationary - 4.3% supply reduction)
  - **Total circulating**: ~957M tokens (95.7%)

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

### 6.3 Fee Parameters
- Defaults:
  - `first_buyer_fee_mist = 1_000_000_000` (1 SUI)
  - `default_platform_fee_bps = 450` (4.5%)
  - `default_creator_fee_bps = 50` (0.5%)
  - `graduation_reward_sui = 100 SUI` (unused, legacy parameter)
  - `default_cooldown_ms` = 30 days
  - `platform_cut_bps_on_graduation = 500` (5% platform share at graduation)
  - `creator_graduation_payout_mist = 40 * 10⁹` (40 SUI to creator at graduation)

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
