module suilfg_launch_memefi::bonding_curve {
    use sui::object::{Self as object, UID, id_address};
    use sui::tx_context::{TxContext, sender};
    use sui::transfer;
    use sui::balance::{Self as balance, Balance};
    use sui::coin::{Self as coin, Coin, TreasuryCap};
    use sui::event;
    use sui::clock::{Self as clock, Clock};
    use std::vector;
    use std::u128;
    use std::u64;
    use std::string;
    use std::option::{Self as option, Option};
    use std::type_name::{Self, TypeName};

    // Import SUILFG_MEMEFI from the deployed faucet package
    use test_sui_faucet::suilfg_memefi::SUILFG_MEMEFI;

    use suilfg_launch_memefi::platform_config as platform_config;
    use suilfg_launch_memefi::platform_config::{PlatformConfig, AdminCap};
    use suilfg_launch_memefi::referral_registry::{Self, ReferralRegistry};
    use suilfg_launch_memefi::ticker_registry::{Self as ticker_registry, TickerRegistry};
    
    // Cetus CLMM imports for automatic pool creation
    use cetus_clmm::config::GlobalConfig;
    use cetus_clmm::pool::{Self as cetus_pool, Pool};
    use cetus_clmm::position::Position;
    use cetus_clmm::pool_creator;
    use cetus_clmm::factory::Pools;
    
    // Our custom LP locker for permanent lock with upgrade-safe flag
    use suilfg_launch_memefi::lp_locker::{Self, LockedLPPosition};

    // Supply constants in whole token units (bonding curve tracks whole tokens, minting converts to smallest units)
    const DECIMALS: u8 = 9;
    const TOTAL_SUPPLY: u64 = 1_000_000_000;  // 1B tokens (in whole units)
    const MAX_CURVE_SUPPLY: u64 = 737_000_000;  // 737M tokens
    const CETUS_POOL_TOKENS: u64 = 207_000_000;  // 207M tokens  
    const TEAM_ALLOCATION: u64 = 2_000_000;  // 2M tokens
    const BURNED_SUPPLY: u64 = 54_000_000;  // 54M tokens
    // Total circulating after graduation: 946M (737M + 2M + 207M)

    public enum TradingStatus has copy, drop, store { Open, Frozen, WhitelistedExit }

    public struct BondingCurve<phantom T: drop> has key, store {
        id: UID,
        status: TradingStatus,
        sui_reserve: Balance<SUILFG_MEMEFI>,
        token_supply: u64,
        platform_fee_bps: u64,
        creator_fee_bps: u64,
        creator: address,
        whitelist: vector<address>,
        m_num: u64, // numerator for price coefficient m
        m_den: u128, // denominator for price coefficient m
        base_price_mist: u64, // base price in mist for starting market cap
        treasury: TreasuryCap<T>,
        // Permissionless graduation parameters
        graduation_target_mist: u64,
        graduated: bool,
        lp_seeded: bool,
        reward_paid: bool,
        // LP fee recipient (changeable by admin)
        lp_fee_recipient: address,
    }

    // TokenCoin removed; we mint/burn Coin<T> directly via TreasuryCap

    public struct Created has copy, drop { creator: address }
    public struct Bought has copy, drop { buyer: address, amount_sui: u64, referrer: address }
    public struct Sold has copy, drop { seller: address, amount_sui: u64, referrer: address }
    public struct Graduated has copy, drop { creator: address, reward_sui: u64, treasury: address }
    public struct GraduationReady has copy, drop { creator: address, token_supply: u64, spot_price_sui_approx: u64 }
    public struct PoolCreated has copy, drop { 
        token_type: TypeName,
        sui_amount: u64,
        token_amount: u64,
        pool_id: address,
        locked_position_id: address,
        lp_fee_recipient: address
    }

    const E_CREATION_PAUSED: u64 = 1;
    const E_TRADING_FROZEN: u64 = 2;
    const E_NOT_WHITELISTED: u64 = 3;
    const E_NOT_GRADUATED: u64 = 4;
    const E_LP_ALREADY_SEEDED: u64 = 5;
    const E_SUPPLY_EXCEEDED: u64 = 6;
    const E_INVALID_CETUS_CONFIG: u64 = 6;
    const E_INVALID_BURN_MANAGER: u64 = 7;
    const E_TICKER_ALREADY_EXISTS: u64 = 8;

    fun init_for_token<T: drop>(cfg: &PlatformConfig, creator: address, treasury: TreasuryCap<T>, ctx: &mut TxContext): BondingCurve<T> {
        BondingCurve<T> {
            id: object::new(ctx),
            status: TradingStatus::Open,
            sui_reserve: balance::zero<SUILFG_MEMEFI>(),
            token_supply: 0,  // Start at 0 (formula includes base_price to prevent division issues)
            platform_fee_bps: platform_config::get_default_platform_fee_bps(cfg),
            creator_fee_bps: platform_config::get_default_creator_fee_bps(cfg),
            creator: creator,
            whitelist: vector::empty<address>(),
            m_num: platform_config::get_default_m_num(cfg),
            m_den: platform_config::get_default_m_den(cfg),
            base_price_mist: platform_config::get_default_base_price_mist(cfg),
            treasury: treasury,
            graduation_target_mist: platform_config::get_default_graduation_target_mist(cfg),
            graduated: false,
            lp_seeded: false,
            reward_paid: false,
            lp_fee_recipient: platform_config::get_lp_recipient_address(cfg),
        }
    }

    fun init_for_token_with_m<T: drop>(cfg: &PlatformConfig, creator: address, treasury: TreasuryCap<T>, m_num: u64, m_den: u128, ctx: &mut TxContext): BondingCurve<T> {
        assert!(m_den > 0, 1101);
        assert!(m_num > 0, 1102);
        BondingCurve<T> {
            id: object::new(ctx),
            status: TradingStatus::Open,
            sui_reserve: balance::zero<SUILFG_MEMEFI>(),
            token_supply: 0,  // Start at 0 (formula includes base_price to prevent division issues)
            platform_fee_bps: platform_config::get_default_platform_fee_bps(cfg),
            creator_fee_bps: platform_config::get_default_creator_fee_bps(cfg),
            creator: creator,
            whitelist: vector::empty<address>(),
            m_num,
            m_den,
            base_price_mist: platform_config::get_default_base_price_mist(cfg),
            treasury: treasury,
            graduation_target_mist: platform_config::get_default_graduation_target_mist(cfg),
            graduated: false,
            lp_seeded: false,
            reward_paid: false,
            lp_fee_recipient: platform_config::get_lp_recipient_address(cfg),
        }
    }

    public fun freeze_trading<T: drop>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::Frozen; }
    public fun initiate_whitelisted_exit<T: drop>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::WhitelistedExit; }

    public entry fun create_new_meme_token<T: drop>(
        cfg: &PlatformConfig,
        ticker_registry: &mut TickerRegistry,
        treasury: TreasuryCap<T>,
        metadata: &coin::CoinMetadata<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        if (platform_config::get_creation_is_paused(cfg)) { abort E_CREATION_PAUSED; } else {};
        
        // Get ticker symbol from metadata
        let ticker_ascii = coin::get_symbol(metadata);
        let ticker_str = string::from_ascii(ticker_ascii);
        
        // Check ticker availability (free claim via cooldown expiry or max lock period)
        let max_lock_ms = platform_config::get_ticker_max_lock_ms(cfg);
        let is_claimable = ticker_registry::is_ticker_claimable(ticker_registry, ticker_str, max_lock_ms, clock);
        
        // If ticker exists and is NOT claimable, it's taken (no fee bypass in simple version)
        if (ticker_registry::contains(ticker_registry, ticker_str) && !is_claimable) {
            abort E_TICKER_ALREADY_EXISTS
        };
        
        let creator_addr = sender(ctx);
        let mut curve = init_for_token<T>(cfg, creator_addr, treasury, ctx);
        let curve_id = object::id(&curve);
        
        // Register ticker with current timestamp
        let now = clock::timestamp_ms(clock);
        let cooldown_ends = now + max_lock_ms;
        
        ticker_registry::mark_active_with_lock(
            ticker_registry,
            ticker_str,
            curve_id,
            now,
            cooldown_ends
        );
        
        event::emit(Created { creator: creator_addr });
        transfer::share_object(curve);
    }

    public entry fun create_new_meme_token_with_m<T: drop>(
        cfg: &PlatformConfig,
        ticker_registry: &mut TickerRegistry,
        treasury: TreasuryCap<T>,
        metadata: &coin::CoinMetadata<T>,
        m_num: u64,
        m_den: u128,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        if (platform_config::get_creation_is_paused(cfg)) { abort E_CREATION_PAUSED; } else {};
        
        // Get ticker symbol from metadata
        let ticker_ascii = coin::get_symbol(metadata);
        let ticker_str = string::from_ascii(ticker_ascii);
        
        // Check ticker availability (free claim via cooldown expiry or max lock period)
        let max_lock_ms = platform_config::get_ticker_max_lock_ms(cfg);
        let is_claimable = ticker_registry::is_ticker_claimable(ticker_registry, ticker_str, max_lock_ms, clock);
        
        // If ticker exists and is NOT claimable, it's taken (no fee bypass in simple version)
        if (ticker_registry::contains(ticker_registry, ticker_str) && !is_claimable) {
            abort E_TICKER_ALREADY_EXISTS
        };
        
        let creator_addr = sender(ctx);
        let mut curve = init_for_token_with_m<T>(cfg, creator_addr, treasury, m_num, m_den, ctx);
        let curve_id = object::id(&curve);
        
        // Register ticker with current timestamp
        let now = clock::timestamp_ms(clock);
        let cooldown_ends = now + max_lock_ms;
        
        ticker_registry::mark_active_with_lock(
            ticker_registry,
            ticker_str,
            curve_id,
            now,
            cooldown_ends
        );
        
        event::emit(Created { creator: creator_addr });
        transfer::share_object(curve);
    }

    // Create with fee-based early ticker reuse (for graduated tokens on cooldown)
    public entry fun create_new_meme_token_with_fee<T: drop>(
        cfg: &PlatformConfig,
        ticker_registry: &mut TickerRegistry,
        treasury: TreasuryCap<T>,
        metadata: &coin::CoinMetadata<T>,
        mut reuse_fee_payment: Coin<SUILFG_MEMEFI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        if (platform_config::get_creation_is_paused(cfg)) { abort E_CREATION_PAUSED; } else {};
        
        // Get ticker symbol from metadata
        let ticker_ascii = coin::get_symbol(metadata);
        let ticker_str = string::from_ascii(ticker_ascii);
        
        // Check if ticker exists and get required fee
        let max_lock_ms = platform_config::get_ticker_max_lock_ms(cfg);
        let is_claimable = ticker_registry::is_ticker_claimable(ticker_registry, ticker_str, max_lock_ms, clock);
        
        let creator_addr = sender(ctx);
        let mut curve = init_for_token<T>(cfg, creator_addr, treasury, ctx);
        let curve_id = object::id(&curve);
        
        let now = clock::timestamp_ms(clock);
        let cooldown_ends = now + max_lock_ms;
        
        // Check if ticker exists (for reuse) or is new
        let ticker_exists = ticker_registry::contains(ticker_registry, ticker_str);
        
        // If claimable for free, refund payment and proceed
        if (is_claimable) {
            transfer::public_transfer(reuse_fee_payment, sender(ctx));
            
            if (ticker_exists) {
                // UPDATE existing ticker (preserves history)
                ticker_registry::update_ticker_for_reuse(ticker_registry, ticker_str, curve_id, now, cooldown_ends);
            } else {
                // New ticker - create fresh entry
                ticker_registry::mark_active_with_lock(ticker_registry, ticker_str, curve_id, now, cooldown_ends);
            };
        } else if (ticker_exists) {
            // Ticker exists and NOT claimable - check if fee can bypass
            let required_fee = ticker_registry::get_current_reuse_fee(ticker_registry, ticker_str);
            let paid = coin::value(&reuse_fee_payment);
            
            if (paid < required_fee) {
                // Not enough fee paid - abort
                transfer::public_transfer(reuse_fee_payment, sender(ctx));
                abort E_TICKER_ALREADY_EXISTS
            };
            
            // Fee is sufficient - collect it to treasury
            let treasury_addr = platform_config::get_treasury_address(cfg);
            transfer::public_transfer(reuse_fee_payment, treasury_addr);
            
            // UPDATE existing ticker (preserves history) - NO REMOVAL!
            ticker_registry::update_ticker_for_reuse(ticker_registry, ticker_str, curve_id, now, cooldown_ends);
        } else {
            // Ticker doesn't exist - refund payment and create fresh
            transfer::public_transfer(reuse_fee_payment, sender(ctx));
            ticker_registry::mark_active_with_lock(ticker_registry, ticker_str, curve_id, now, cooldown_ends);
        };
        
        event::emit(Created { creator: creator_addr });
        transfer::share_object(curve);
    }

    public entry fun buy<T: drop>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        referral_registry: &mut ReferralRegistry,
        mut payment: Coin<SUILFG_MEMEFI>,
        max_sui_in: u64,
        min_tokens_out: u64,
        deadline_ts_ms: u64,
        referrer: Option<address>,
        clk: &Clock,
        ctx: &mut TxContext
    ) {
        // Only allow when open
        match (curve.status) {
            TradingStatus::Open => { },
            TradingStatus::Frozen => { abort E_TRADING_FROZEN; },
            TradingStatus::WhitelistedExit => { abort E_TRADING_FROZEN; }
        };

        // Deadline check
        if (clock::timestamp_ms(clk) > deadline_ts_ms) { abort 4; } else {}; // E_DEADLINE_EXPIRED
        
        let buyer = sender(ctx);
        
        // AUTO-REGISTER: Try to set referrer if provided and user has none
        if (option::is_some(&referrer)) {
            referral_registry::try_register(
                referral_registry,
                buyer,
                *option::borrow(&referrer),
                clock::timestamp_ms(clk)
            );
        };

        let gross_in = coin::value(&payment);
        if (gross_in > max_sui_in) { abort 5; }; // E_MAX_IN_EXCEEDED

        // First buyer fee if first-ever buy
        {
            if (curve.token_supply == 0) {
                let fee = platform_config::get_first_buyer_fee_mist(cfg);
                if (fee > 0) {
                    let fee_coin = coin::split(&mut payment, fee, ctx);
                    transfer::public_transfer(fee_coin, platform_config::get_treasury_address(cfg));
                };
            };
        };

        // Calculate fees
        let trade_amount_after_first_fee = coin::value(&payment);
        let platform_fee = trade_amount_after_first_fee * curve.platform_fee_bps / 10_000;
        let creator_fee = trade_amount_after_first_fee * curve.creator_fee_bps / 10_000;
        
        // Calculate and pay referral reward (comes from platform's cut)
        let referral_fee = calculate_and_pay_referral(
            cfg,
            referral_registry,
            buyer,
            trade_amount_after_first_fee,
            &mut payment,
            ctx
        );
        
        // Platform gets: platform_fee - referral_fee
        let actual_platform_fee = platform_fee - referral_fee;
        
        if (actual_platform_fee > 0) {
            let fee_coin = coin::split(&mut payment, actual_platform_fee, ctx);
            transfer::public_transfer(fee_coin, platform_config::get_treasury_address(cfg));
        };
        if (creator_fee > 0) {
            let fee_coin = coin::split(&mut payment, creator_fee, ctx);
            transfer::public_transfer(fee_coin, curve.creator);
        };

        // Remaining trade amount
        let trade_in = coin::value(&payment);

        // Compute target s2 via inverse integral, clamped by MAX_CURVE_SUPPLY
        let s1 = curve.token_supply;
        let s2_target = inverse_integral_buy(s1, trade_in, curve.m_num, curve.m_den, curve.base_price_mist);
        let s2_clamped = min_u64(s2_target, MAX_CURVE_SUPPLY); // FIX: Stop at 737M, not 1B!
        let tokens_out = s2_clamped - s1;
        if (tokens_out < min_tokens_out || tokens_out == 0) { abort 6; }; // E_MIN_OUT_NOT_MET

        // Compute exact used amount for tokens_out and split refund
        // If we hit supply cap (s2_clamped < s2_target), ALWAYS refund excess
        // Otherwise, only refund if remaining > 0.001 SUI (dust threshold)
        let used_u128 = integrate_cost_u128(s1, s2_clamped, curve.m_num, curve.m_den, curve.base_price_mist);
        let used = narrow_u128_to_u64(used_u128);
        let payment_value = coin::value(&payment);
        
        // Only calculate refund if we have more than needed
        if (used < payment_value) {
            let remaining = payment_value - used;
            let hit_supply_cap = s2_clamped < s2_target;
            let dust_threshold = 1_000_000; // 0.001 SUI
            
            if (hit_supply_cap) {
                // Near graduation: ALWAYS refund excess, regardless of amount
                if (remaining > 0) {
                    let refund = coin::split(&mut payment, remaining, ctx);
                    transfer::public_transfer(refund, sender(ctx));
                };
            } else {
                // Normal case: only refund if > dust threshold
                if (remaining > dust_threshold) {
                    let refund = coin::split(&mut payment, remaining, ctx);
                    transfer::public_transfer(refund, sender(ctx));
                };
            };
        };

        // Deposit used amount into reserve
        let deposit = coin::into_balance(payment);
        balance::join(&mut curve.sui_reserve, deposit);

        // Mint tokens as Coin<T> to buyer and update supply
        // token_supply tracks whole tokens, but minting requires smallest units (with decimals)
        curve.token_supply = s2_clamped;
        let tokens_to_mint = tokens_out * 1_000_000_000; // Convert whole tokens to smallest units (9 decimals)
        let minted: Coin<T> = coin::mint<T>(&mut curve.treasury, tokens_to_mint, ctx);
        transfer::public_transfer(minted, buyer);
        
        let referrer_addr = if (option::is_some(&referral_registry::get_referrer(referral_registry, buyer))) {
            *option::borrow(&referral_registry::get_referrer(referral_registry, buyer))
        } else {
            @0x0
        };
        event::emit(Bought { buyer, amount_sui: used, referrer: referrer_addr });
    }

    public entry fun sell<T: drop>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        referral_registry: &mut ReferralRegistry,
        mut tokens: Coin<T>,
        amount_tokens: u64,
        min_sui_out: u64,
        deadline_ts_ms: u64,
        referrer: Option<address>,
        clk: &Clock,
        ctx: &mut TxContext
    ) {
        // Only allow when open or whitelisted exit; if WL, enforce allowlist
        let seller = sender(ctx);
        match (curve.status) {
            TradingStatus::Open => { },
            TradingStatus::Frozen => { abort E_TRADING_FROZEN; },
            TradingStatus::WhitelistedExit => {
                if (!is_whitelisted(&curve.whitelist, seller)) { abort E_NOT_WHITELISTED; }
            }
        };

        if (clock::timestamp_ms(clk) > deadline_ts_ms) { abort 4; } else {}; // E_DEADLINE_EXPIRED
        
        // AUTO-REGISTER: Try to set referrer if provided (in case they received tokens)
        if (option::is_some(&referrer)) {
            referral_registry::try_register(
                referral_registry,
                seller,
                *option::borrow(&referrer),
                clock::timestamp_ms(clk)
            );
        };

        // Compute payout and fees
        // Convert amount_tokens from smallest units (coin balance) to whole tokens (supply tracking)
        let amount_tokens_whole = amount_tokens / 1_000_000_000;
        let s1 = curve.token_supply;
        let s2 = s1 - amount_tokens_whole;
        let gross = narrow_u128_to_u64(integrate_cost_u128(s2, s1, curve.m_num, curve.m_den, curve.base_price_mist));

        if (gross < min_sui_out) { abort 7; } else {}; // E_MIN_SUI_OUT_NOT_MET

        let platform_fee = gross * curve.platform_fee_bps / 10_000;
        let creator_fee = gross * curve.creator_fee_bps / 10_000;
        
        // Calculate referral fee (comes from platform's cut)
        let referral_bps = platform_config::get_referral_fee_bps(cfg);
        let referrer_opt = referral_registry::get_referrer(referral_registry, seller);
        let referral_fee = if (option::is_some(&referrer_opt)) {
            gross * referral_bps / 10_000
        } else {
            0
        };
        
        // Platform gets: platform_fee - referral_fee
        let actual_platform_fee = platform_fee - referral_fee;
        let net = gross - actual_platform_fee - creator_fee - referral_fee;

        // Burn the tokens being sold; if needed, split first
        let val = coin::value(&tokens);
        if (val == amount_tokens) {
            coin::burn<T>(&mut curve.treasury, tokens);
        } else {
            let to_burn = coin::split<T>(&mut tokens, amount_tokens, ctx);
            coin::burn<T>(&mut curve.treasury, to_burn);
            // Return remaining tokens to sender
            transfer::public_transfer(tokens, sender(ctx));
        };

        // Withdraw from reserve
        let payout_bal = balance::split(&mut curve.sui_reserve, net);
        let payout_coin = coin::from_balance(payout_bal, ctx);
        transfer::public_transfer(payout_coin, seller);

        // Pay referral reward if applicable
        if (referral_fee > 0 && option::is_some(&referrer_opt)) {
            let referrer = *option::borrow(&referrer_opt);
            let ref_bal = balance::split(&mut curve.sui_reserve, referral_fee);
            let ref_coin = coin::from_balance(ref_bal, ctx);
            transfer::public_transfer(ref_coin, referrer);
            
            // Update stats
            referral_registry::record_reward(referral_registry, referrer, referral_fee);
        };

        if (actual_platform_fee > 0) {
            let fee_bal = balance::split(&mut curve.sui_reserve, actual_platform_fee);
            let fee_coin = coin::from_balance(fee_bal, ctx);
            transfer::public_transfer(fee_coin, platform_config::get_treasury_address(cfg));
        };
        if (creator_fee > 0) {
            let fee_bal = balance::split(&mut curve.sui_reserve, creator_fee);
            let fee_coin = coin::from_balance(fee_bal, ctx);
            transfer::public_transfer(fee_coin, curve.creator);
        };

        curve.token_supply = curve.token_supply - amount_tokens_whole;
        
        let referrer_addr = if (option::is_some(&referrer_opt)) {
            *option::borrow(&referrer_opt)
        } else {
            @0x0
        };
        event::emit(Sold { seller, amount_sui: net, referrer: referrer_addr });
    }

    public entry fun try_graduate<T: drop>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        _ctx: &mut TxContext
    ) {
        if (curve.graduated) { return; } else {};
        if (!(curve.status == TradingStatus::Open)) { abort E_TRADING_FROZEN; } else {};
        let reserve = balance::value<SUILFG_MEMEFI>(&curve.sui_reserve);
        if (reserve < platform_config::get_default_graduation_target_mist(cfg)) { abort 9001; } else {};
        curve.status = TradingStatus::Frozen;
        curve.graduated = true;
        let spot_u64 = spot_price_u64(curve);
        event::emit(GraduationReady { creator: curve.creator, token_supply: curve.token_supply, spot_price_sui_approx: spot_u64 });
    }

    public entry fun distribute_payouts<T: drop>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        ctx: &mut TxContext
    ) {
        if (!curve.graduated || curve.reward_paid) { return; } else {};
        let reserve = balance::value<SUILFG_MEMEFI>(&curve.sui_reserve);
        let platform_cut = (reserve * platform_config::get_platform_cut_bps_on_graduation(cfg)) / 10_000;
        let creator_payout = platform_config::get_creator_graduation_payout_mist(cfg);
        
        // Platform takes its cut (10% = 1,333 SUI)
        if (platform_cut > 0) {
            let platform_balance = balance::split(&mut curve.sui_reserve, platform_cut);
            let mut platform_coin = coin::from_balance(platform_balance, ctx);
            
            // Creator payout comes FROM platform's cut (40 SUI from 1,333 SUI)
            if (creator_payout > 0 && creator_payout <= platform_cut) {
                let creator_coin = coin::split(&mut platform_coin, creator_payout, ctx);
                transfer::public_transfer(creator_coin, curve.creator);
            };
            
            // Platform keeps the rest (1,293 SUI)
            transfer::public_transfer(platform_coin, platform_config::get_treasury_address(cfg));
        };
        
        curve.reward_paid = true;
        // Note: Remaining 12,000 SUI stays in reserve for LP seeding (90% of 13,333)
    }

    /// Legacy function for manual pool creation (kept for backwards compatibility)
    /// DEPRECATED: Use seed_pool_and_create_cetus_with_lock() instead
    /// 
    /// SECURITY: Team allocation sent to treasury_address (from config)
    public entry fun seed_pool_prepare<T: drop>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        bump_bps: u64,
        ctx: &mut TxContext
    ) {
        if (!curve.graduated || curve.lp_seeded == true) { abort 9002; } else {};
        let reserve = balance::value<SUILFG_MEMEFI>(&curve.sui_reserve);
        let use_bps = if (bump_bps == 0) { platform_config::get_default_cetus_bump_bps(cfg) } else { bump_bps };
        
        // First, mint and transfer team allocation
        // SECURITY: Always sent to treasury_address from config (admin controlled)
        let team_allocation = platform_config::get_team_allocation_tokens(cfg);
        let team_tokens: Coin<T> = coin::mint<T>(&mut curve.treasury, team_allocation * 1_000_000_000, ctx);
        let team_address = platform_config::get_treasury_address(cfg);
        transfer::public_transfer(team_tokens, team_address);
        
        // Update token supply to include team allocation (FIX: was missing!)
        curve.token_supply = curve.token_supply + team_allocation;
        
        // Calculate optimal pool seeding with configured bump
        let p_curve_u128 = spot_price_u128(curve);
        let p_target_u128 = (p_curve_u128 * ((10_000 + use_bps) as u128)) / (10_000 as u128);
        let p_target_u64 = narrow_u128_to_u64(p_target_u128);
        
        // Use all remaining reserve for LP deposit
        let sui_lp = reserve;
        // Calculate optimal tokens for pool to maintain target price
        let optimal_tokens_for_pool = sui_lp / p_target_u64;
        
        // Calculate remaining unminted tokens
        let remaining_tokens = TOTAL_SUPPLY - curve.token_supply;
        
        // Only mint what's optimal for the pool (burn the rest by not minting - deflationary!)
        let tokens_to_mint = min_u64(optimal_tokens_for_pool, remaining_tokens);
        
        // Mint tokens for LP to treasury address custody
        let token_lp: Coin<T> = coin::mint<T>(&mut curve.treasury, tokens_to_mint * 1_000_000_000, ctx);
        curve.token_supply = curve.token_supply + tokens_to_mint;
        
        let bal_sui_lp = balance::split(&mut curve.sui_reserve, sui_lp);
        let sui_lp_coin = coin::from_balance(bal_sui_lp, ctx);
        
        // Transfer both to LP recipient (configurable wallet for liquidity management)
        let lp_recipient = platform_config::get_lp_recipient_address(cfg);
        transfer::public_transfer(token_lp, lp_recipient);
        transfer::public_transfer(sui_lp_coin, lp_recipient);
        curve.lp_seeded = true;
    }

    /// Creates Cetus pool with PERMANENT LP burn (cannot be removed!)
    /// This is the PRIMARY graduation function - fully automatic, on-chain
    /// 
    /// Steps:
    /// 1. Mints team allocation (2M tokens)
    /// 2. Creates Cetus CLMM pool with initial liquidity
    /// 3. BURNS the LP position permanently (maximum trust!)
    /// 4. Stores CetusLPBurnProof for fee collection
    /// 5. Platform earns LP fees forever (changeable recipient)
    ///
    /// Parameters:
    /// - cetus_global_config: Cetus protocol config object (validated!)
    /// - burn_manager: Cetus LP burn manager (validated!)
    /// - pools: Cetus pools registry
    /// - tick_spacing: Pool tick spacing (60 for 0.3% fee tier)
    /// - coin_metadata: Token metadata for pool creation
    /// 
    /// SECURITY FEATURES:
    /// 1. Team allocation sent to treasury_address (admin controlled)
    /// 2. Cetus config validated against admin-set address
    /// 3. LP position PERMANENTLY BURNED - cannot rug!
    /// 4. Fee recipient changeable for flexibility
    public entry fun seed_pool_and_create_cetus_with_lock<T: drop>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        cetus_global_config: &GlobalConfig,
        pools: &mut Pools,
        tick_spacing: u32,
        initialize_sqrt_price: u128,
        coin_metadata_sui: &coin::CoinMetadata<SUILFG_MEMEFI>,
        coin_metadata_token: &coin::CoinMetadata<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(curve.graduated, E_NOT_GRADUATED);
        assert!(!curve.lp_seeded, E_LP_ALREADY_SEEDED);
        
        // SECURITY: Validate Cetus config matches admin-approved address
        let expected_cetus_config = platform_config::get_cetus_global_config_id(cfg);
        let actual_cetus_config = object::id_address(cetus_global_config);
        assert!(actual_cetus_config == expected_cetus_config, E_INVALID_CETUS_CONFIG);
        
        // 1. Mint team allocation (2M tokens)
        // SECURITY: Always sent to treasury_address from config (admin controlled)
        let team_allocation = platform_config::get_team_allocation_tokens(cfg);
        let team_tokens = coin::mint(&mut curve.treasury, team_allocation * 1_000_000_000, ctx);
        let team_recipient = platform_config::get_treasury_address(cfg);
        transfer::public_transfer(team_tokens, team_recipient);
        
        // Update token supply to reflect minted tokens
        curve.token_supply = curve.token_supply + team_allocation;
        
        // 2. Calculate pool amounts
        let total_sui_mist = balance::value(&curve.sui_reserve);
        let sui_for_lp = total_sui_mist; // Use all remaining reserve
        
        let remaining_supply = TOTAL_SUPPLY - curve.token_supply;
        let token_for_lp = remaining_supply;
        
        // 3. Mint tokens for LP
        let lp_tokens = coin::mint(&mut curve.treasury, token_for_lp * 1_000_000_000, ctx);
        let lp_sui_balance = balance::split(&mut curve.sui_reserve, sui_for_lp);
        let lp_sui_coin = coin::from_balance(lp_sui_balance, ctx);
        
        // 4. Create Cetus pool with initial liquidity using pool_creator
        // This automatically creates pool + adds liquidity in one transaction
        let (tick_lower, tick_upper) = pool_creator::full_range_tick_range(tick_spacing);
        
        let (position_nft, refund_sui, refund_token) = pool_creator::create_pool_v2<SUILFG_MEMEFI, T>(
            cetus_global_config,
            pools,
            tick_spacing,
            initialize_sqrt_price,
            std::string::utf8(b"SuiLFG Pool"),
            tick_lower,
            tick_upper,
            lp_sui_coin,
            lp_tokens,
            coin_metadata_sui,
            coin_metadata_token,
            true, // fix_amount_a (use all SUI)
            clock,
            ctx
        );
        
        // Handle refunds (should be minimal/zero for full range)
        if (coin::value(&refund_sui) > 0) {
            let refund_balance = coin::into_balance(refund_sui);
            balance::join(&mut curve.sui_reserve, refund_balance);
        } else {
            coin::destroy_zero(refund_sui);
        };
        if (coin::value(&refund_token) > 0) {
            coin::burn(&mut curve.treasury, refund_token);
        } else {
            coin::destroy_zero(refund_token);
        };
        
        // 5. PERMANENTLY LOCK the LP position in our custom locker!
        // This makes liquidity removal IMPOSSIBLE with upgrade-safe flag
        let pool_id = @0x0; // Pool address will be in Cetus events
        let locked_lp = lp_locker::lock_position_permanent<SUILFG_MEMEFI, T>(
            position_nft,
            object::id_from_address(pool_id),
            curve.lp_fee_recipient,
            object::id(curve),
            clock::timestamp_ms(clock),
            ctx
        );
        
        let locked_position_id = object::id_address(&locked_lp);
        
        // 6. Share the locked position object - anyone can verify it's permanently locked!
        // Fees can still be collected via collect_lp_fees function
        lp_locker::share_locked_position(locked_lp);
        
        curve.lp_seeded = true;
        curve.token_supply = curve.token_supply + token_for_lp;
        
        event::emit(PoolCreated {
            token_type: type_name::get<T>(),
            sui_amount: sui_for_lp,
            token_amount: token_for_lp,
            pool_id: @0x0, // Pool is shared, can be found via Cetus events
            locked_position_id,
            lp_fee_recipient: curve.lp_fee_recipient
        });
    }
    
    /// Collect LP fees from LOCKED Cetus position (permissionless!)
    /// Anyone can call this to send accumulated fees to the changeable lp_fee_recipient
    /// 
    /// This works even though liquidity is permanently locked!
    /// Note: The locked_lp object can be different from curve's original lock,
    /// so anyone can collect fees from any locked position to its designated recipient.
    public entry fun collect_lp_fees_from_locked_position<T: drop>(
        locked_lp: &mut LockedLPPosition<SUILFG_MEMEFI, T>,
        cetus_config: &GlobalConfig,
        pool: &mut Pool<SUILFG_MEMEFI, T>,
        ctx: &mut TxContext
    ) {
        // Delegate to lp_locker module (which handles the actual collection)
        lp_locker::collect_lp_fees<SUILFG_MEMEFI, T>(
            locked_lp,
            cetus_config,
            pool,
            ctx
        );
    }
    
    /// Change the LP fee recipient address (admin only)
    /// This allows flexibility while keeping liquidity permanently locked
    public entry fun set_lp_fee_recipient<T: drop>(
        _admin: &AdminCap,
        curve: &mut BondingCurve<T>,
        new_recipient: address
    ) {
        curve.lp_fee_recipient = new_recipient;
    }
    
    /// View current LP fee recipient
    public fun get_lp_fee_recipient<T: drop>(curve: &BondingCurve<T>): address {
        curve.lp_fee_recipient
    }

    public fun spot_price_u128<T: drop>(curve: &BondingCurve<T>): u128 {
        // p(s) = base_price + (m_num/m_den) * s^2
        let s = curve.token_supply;
        let s128 = (s as u128);
        let quadratic_part = ((curve.m_num as u128) * s128 * s128) / curve.m_den;
        (curve.base_price_mist as u128) + quadratic_part
    }

    public fun spot_price_u64<T: drop>(curve: &BondingCurve<T>): u64 { narrow_u128_to_u64(spot_price_u128(curve)) }

    public fun minted_supply<T: drop>(curve: &BondingCurve<T>): u64 { curve.token_supply }

    public entry fun withdraw_reserve_to_treasury<T: drop>(
        _admin: &AdminCap,
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        amount_sui: u64,
        ctx: &mut TxContext
    ) {
        let bal = balance::split(&mut curve.sui_reserve, amount_sui);
        let c = coin::from_balance(bal, ctx);
        transfer::public_transfer(c, platform_config::get_treasury_address(cfg));
    }

    public entry fun withdraw_reserve_to<T: drop>(
        _admin: &AdminCap,
        curve: &mut BondingCurve<T>,
        to: address,
        amount_sui: u64,
        ctx: &mut TxContext
    ) {
        let bal = balance::split(&mut curve.sui_reserve, amount_sui);
        let c = coin::from_balance(bal, ctx);
        transfer::public_transfer(c, to);
    }

    public fun add_to_whitelist<T: drop>(_admin: &AdminCap, curve: &mut BondingCurve<T>, user: address) {
        vector::push_back(&mut curve.whitelist, user);
    }

    fun is_whitelisted(list: &vector<address>, user: address): bool {
        let len: u64 = vector::length<address>(list);
        let mut i: u64 = 0;
        while (i < len) {
            if (*vector::borrow<address>(list, i) == user) { return true; };
            i = i + 1;
        };
        false
    }

    // Integral helper: returns cost to move supply from s1 to s2 under p(s)=base+m*s^2
    fun integrate_cost_u128(s1: u64, s2: u64, m_num: u64, m_den: u128, base_price_mist: u64): u128 {
        let s1c = pow3_u128_from_u64(s1);
        let s2c = pow3_u128_from_u64(s2);
        let delta_cubic = s2c - s1c; // s2 >= s1 in buy; in sell we pass (s2,s1)
        let delta_linear = (s2 as u128) - (s1 as u128);
        
        let quadratic_cost = ((m_num as u128) * delta_cubic) / ((3 as u128) * m_den);
        let linear_cost = (base_price_mist as u128) * delta_linear;
        
        quadratic_cost + linear_cost
    }

    // Inverse: given s1 and amount_in, compute maximal s2 such that cost <= amount_in
    // For p(s) = base + m*s^2, we need to solve: base*(s2-s1) + (m/3)*(s2^3-s1^3) = amount_in
    // This requires binary search as there's no closed-form solution
    fun inverse_integral_buy(s1: u64, amount_in: u64, m_num: u64, m_den: u128, base_price_mist: u64): u64 {
        // Binary search approach
        let mut lo: u64 = s1;
        let mut hi: u64 = TOTAL_SUPPLY;
        
        while (lo < hi) {
            let mid = (lo + hi + 1) / 2;
            let cost = narrow_u128_to_u64(integrate_cost_u128(s1, mid, m_num, m_den, base_price_mist));
            if (cost <= amount_in) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        };
        lo
    }

    fun pow3_u128_from_u64(x: u64): u128 {
        let x128 = (x as u128);
        x128 * x128 * x128
    }

    fun cbrt_floor_u64(x: u128): u64 {
        let mut lo: u64 = 0;
        let mut hi: u64 = TOTAL_SUPPLY;
        while (lo < hi) {
            let mid = (lo + hi + 1) / 2;
            let mid3 = pow3_u128_from_u64(mid);
            if (mid3 <= x) {
                lo = mid;
            } else {
                hi = mid - 1;
            }
        };
        lo
    }

    fun narrow_u128_to_u64(x: u128): u64 {
        let max64 = (u64::max_value!() as u128);
        if (x > max64) { u64::max_value!() } else { (x as u64) }
    }

    fun min_u64(a: u64, b: u64): u64 { if (a < b) { a } else { b } }
    
    /// Calculate and pay referral reward (returns fee amount paid)
    fun calculate_and_pay_referral(
        cfg: &PlatformConfig,
        referral_registry: &mut ReferralRegistry,
        trader: address,
        trade_amount: u64,
        payment: &mut Coin<SUILFG_MEMEFI>,
        ctx: &mut TxContext
    ): u64 {
        // Check if trader has referrer on-chain
        let referrer_opt = referral_registry::get_referrer(referral_registry, trader);
        
        if (option::is_none(&referrer_opt)) {
            return 0  // No referrer, no fee
        };
        
        let referrer = *option::borrow(&referrer_opt);
        let referral_bps = platform_config::get_referral_fee_bps(cfg);
        let referral_fee = trade_amount * referral_bps / 10_000;
        
        if (referral_fee > 0) {
            // Pay referrer INSTANTLY
            let referral_coin = coin::split(payment, referral_fee, ctx);
            transfer::public_transfer(referral_coin, referrer);
            
            // Update stats
            referral_registry::record_reward(referral_registry, referrer, referral_fee);
        };
        
        referral_fee
    }
}
