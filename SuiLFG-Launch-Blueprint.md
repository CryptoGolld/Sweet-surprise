# SuiLFG Launch — Final Master Blueprint (v4.0)

## 1. Vision & Mission
SuiLFG Launch is the official memecoin launchpad for the SuiLFG ecosystem. It blends the FOMO-driven virality of Pump.fun with robust security, transparent fees, and a clear graduation path to AMMs (Cetus). The platform is designed for longevity, with upgradable smart contracts that can be entrusted to a community DAO over time.

Goals:
- Make launching meme coins on Sui fast, safe, and thrilling
- Ensure sane default security measures and emergency controls
- Provide a fair fee model for platform and creators
- Enable a path to community ownership via DAO-controlled `UpgradeCap`

## 2. Architecture & Upgradeability
- Modular Move package `suilfg_launch` containing:
  - `platform_config`: central configuration and admin control object
  - `ticker_registry`: ticker lifecycle, cooldowns, reservations, and auctions (future)
- `bonding_curve`: the trading engine with an exponential (quadratic) price curve, permissionless graduation, and platform-configurable parameters
- Upgradability: The package is upgradable via Sui’s `UpgradeCap`. Inits use one-time witness types per module, enabling safe initialization on publish and future upgrades without breaking invariants. The target governance plan transfers the `UpgradeCap` to a community DAO at maturity.

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
  - `graduation_reward_sui: u64` — reward paid to a token’s creator on graduation
- `AdminCap` (key, store): unique capability authorizing all admin updates
- `PLATFORM_CONFIG` (one-time witness): used for internal `init`

Admin Functions (require `&AdminCap`):
- `set_treasury_address(cfg, addr)`
- `pause_creation(cfg)` / `resume_creation(cfg)`
- `set_first_buyer_fee(cfg, fee_mist)`
- `set_platform_fee(cfg, fee_bps)`
- `set_creator_fee(cfg, fee_bps)`
- `set_graduation_reward(cfg, amount_sui)`

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
Purpose: Main trading engine for a token with an exponential (quadratic) price curve and fixed total supply of 1,000,000,000. Supports permissionless graduation sequence and platform-configurable defaults.

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
  - `m_num: u64`, `m_den: u64` — price coefficient ratio (m = m_num/m_den)
  - `graduation_target_mist: u64` — threshold for permissionless graduation
  - `graduated: bool`, `lp_seeded: bool`, `reward_paid: bool` — step flags
- `TokenCoin<T: store>` (key, store): minted/burned token coins representing the bonding curve token

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
  - Creator’s optional auto-buy is done by calling `buy` in the same PTB right after creation
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

Bonding Curve Math (Quadratic/Exponential):
- Price function: `p(s) = m * s^2` where `m = m_num/m_den`
- Integral Cost for buy from s1 to s2: `cost = (m/3) * (s2^3 - s1^3)`
- Inverse for buy: `s2 = floor_cuberoot(s1^3 + 3*cost/m)`
- Sell payout: exact integral from `s2` to `s1`
- Implementation Details:
  - Uses u128 intermediates for safety; converts to u64 as needed
  - Rounds tokens_out down; clamps at `TOTAL_SUPPLY`; refunds residual SUI to caller

Public Functions:
  - `create_new_meme_token<T>(cfg, ctx)` — creates the curve object using default m
  - `create_new_meme_token_with_m<T>(cfg, m_num, m_den, ctx)` — per-token override for m
  - `buy<T>(cfg, &mut curve, payment: Coin<SUI>, max_sui_in, min_tokens_out, deadline_ts_ms, &Clock, &mut TxContext)`
  - routes first-buyer/platform/creator fees, computes tokens_out via inverse and integral, mints `TokenCoin<T>` to buyer
- `sell<T>(cfg, &mut curve, tokens: TokenCoin<T>, amount_tokens, min_sui_out, deadline_ts_ms, &Clock, &mut TxContext)`
  - burns token coins, pays out SUI from reserve minus fees
- `graduate_to_cetus<T>(cfg, &mut curve, &mut TxContext)`
  - Emits `Graduated` event. Off-chain bot should transfer `graduation_reward_sui` from `treasury_address` to creator

Admin Functions:
- `freeze_trading<T>(&AdminCap, &mut curve)`
- `initiate_whitelisted_exit<T>(&AdminCap, &mut curve)`
- `add_to_whitelist<T>(&AdminCap, &mut curve, user)`

## 4. Off-Chain & Frontend
- IPFS Integration: Image upload and pinning for token icons/metadata
- Admin PTB Scripts: Full coverage for all admin functions and periodic tasks
- Creator UI: Token creation form with optional “Initial Creator Buy (SUI Amount)” and a clear note about the 1 SUI first-buyer fee
- Graduation Bot: Listens for `Graduated` events; constructs PTB to pay `graduation_reward_sui` from treasury to the token’s creator

## 5. Security & Risk Controls
- Global `creation_is_paused` big red button
- Per-curve `freeze_trading` and `WhitelistedExit` for controlled unwind
- Slippage + deadlines to mitigate MEV/sandwiches
- Clear events and status transitions for observability and recovery

## 6. Parameters & Calibration
- Defaults:
  - `first_buyer_fee_mist = 1_000_000_000` (1 SUI)
  - `default_platform_fee_bps = 450` (4.5%)
  - `default_creator_fee_bps = 50` (0.5%)
- `graduation_reward_sui` e.g. 100 SUI
  - `default_cooldown_ms` = 30 days
  - `default_m = 1/1` placeholder (calibrate via `set_default_m`)
  - `default_graduation_target_mist = 10_000 SUI` (configurable)
  - `platform_cut_bps_on_graduation = 500` (5% platform share at graduation)
  - `creator_graduation_payout_sui` example: 40 SUI (configurable)
- `m_num/m_den` selection should be simulated to target desired reserve and price path at “graduation” supply; can be updated post-deploy via an admin function if added in future iteration

## 7. Upgrade & Governance Plan
- Short-term: Team controls `UpgradeCap` and can deliver fixes/updates rapidly
- Medium-term: Introduce vote-guardrails with a multisig or timelock
- Long-term: Transfer `UpgradeCap` to a community DAO following traction and audits

## 8. Roadmap — Next Iterations
- Complete Auction mechanics for tickers (bid, outbid, finalize, claim)
- Strengthen math using thoroughly tested u128 helpers across the codebase
- Gas/size optimizations and event indexing for analytics
- Comprehensive Move tests; fuzzing around slippage, rounding and supply edges
- Tooling: SDK and TypeScript bindings; example PTBs and subgraph-like indexers

## 9. Testing Strategy
- Unit tests: fee routing, first-buyer, slippage/deadline, freeze/whitelist
- Property tests: monotonic price, refunds correctness, supply clamp invariants
- Scenario tests: launch + buys + sells + freeze + whitelisted exit + graduate
- Off-chain tests: PTB scripts through a localnet/devnet with event assertions

## 10. Deployment Checklist
- Confirm package edition = 2024 and compile against pinned Sui framework
- Publish and capture `UpgradeCap` securely
- Initialize `PLATFORM_CONFIG` and `TICKER_REGISTRY`
- Set initial parameters in `PlatformConfig`
- Smoke test: Create a token, buy/sell, freeze, whitelist exit, graduate
- Configure Graduation Bot with treasury signer

## 11. Audit Pointers
- Access control: ensure all admin paths require `&AdminCap`
- Math correctness: buy/sell integrals, inverse rounding, refunds/dust
- Shared object invariants: curve reserve cannot be drained without token burn
- Event coverage: ensure monitoring of all critical transitions
- Upgrade safety: witness inits idempotency; avoid storage layout traps. Graduation can be permissionless: any caller can trigger once the curve reserve ≥ `graduation_target_mist`. LP seeding and reward payment can be separate permissionless steps guarded by one-time flags.

## 12. Glossary
- `UpgradeCap`: the capability that allows package upgrades
- `Witness`: one-time module type used to gate internal init
- `PTB`: Programmable Transaction Block, Sui’s composable multi-call TX
- `bps`: basis points, 1/100th of a percent
- `SUI`: native coin on Sui network
