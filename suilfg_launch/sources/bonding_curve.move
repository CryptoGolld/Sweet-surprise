module suilfg_launch::bonding_curve {
    use sui::object::{UID};
    use sui::object;
    use sui::tx_context::{TxContext, sender};
    use sui::transfer;
    use sui::balance::{Self as balance, Balance};
    use sui::coin::{Self as coin, Coin, TreasuryCap};
    use sui::sui::SUI;
    use sui::event;
    use sui::clock::{Self as clock, Clock};
    use std::vector;
    use std::u128;
    use std::u64;

    use suilfg_launch::platform_config as platform_config;
    use suilfg_launch::platform_config::{PlatformConfig, AdminCap};

    const TOTAL_SUPPLY: u64 = 1_000_000_000;

    public enum TradingStatus has copy, drop, store { Open, Frozen, WhitelistedExit }

    public struct BondingCurve<phantom T: drop + store> has key, store {
        id: UID,
        status: TradingStatus,
        sui_reserve: Balance<SUI>,
        token_supply: u64,
        platform_fee_bps: u64,
        creator_fee_bps: u64,
        creator: address,
        whitelist: vector<address>,
        m_num: u64, // numerator for price coefficient m (placeholder)
        m_den: u64, // denominator for price coefficient m (placeholder)
        treasury: TreasuryCap<T>,
        // Permissionless graduation parameters
        graduation_target_mist: u64,
        graduated: bool,
        lp_seeded: bool,
        reward_paid: bool,
    }

    // TokenCoin removed; we mint/burn Coin<T> directly via TreasuryCap

    public struct Created has copy, drop { creator: address }
    public struct Bought has copy, drop { buyer: address, amount_sui: u64 }
    public struct Sold has copy, drop { seller: address, amount_sui: u64 }
    public struct Graduated has copy, drop { creator: address, reward_sui: u64, treasury: address }
    public struct GraduationReady has copy, drop { creator: address, token_supply: u64, spot_price_sui_approx: u64 }

    const E_CREATION_PAUSED: u64 = 1;
    const E_TRADING_FROZEN: u64 = 2;
    const E_NOT_WHITELISTED: u64 = 3;

    fun init_for_token<T: drop + store>(cfg: &PlatformConfig, creator: address, treasury: TreasuryCap<T>, ctx: &mut TxContext): BondingCurve<T> {
        BondingCurve<T> {
            id: object::new(ctx),
            status: TradingStatus::Open,
            sui_reserve: balance::zero<SUI>(),
            token_supply: 0,
            platform_fee_bps: platform_config::get_default_platform_fee_bps(cfg),
            creator_fee_bps: platform_config::get_default_creator_fee_bps(cfg),
            creator: creator,
            whitelist: vector::empty<address>(),
            m_num: platform_config::get_default_m_num(cfg),
            m_den: platform_config::get_default_m_den(cfg),
            treasury: treasury,
            graduation_target_mist: platform_config::get_default_graduation_target_mist(cfg),
            graduated: false,
            lp_seeded: false,
            reward_paid: false,
        }
    }

    fun init_for_token_with_m<T: drop + store>(cfg: &PlatformConfig, creator: address, treasury: TreasuryCap<T>, m_num: u64, m_den: u64, ctx: &mut TxContext): BondingCurve<T> {
        assert!(m_den > 0, 1101);
        assert!(m_num > 0, 1102);
        BondingCurve<T> {
            id: object::new(ctx),
            status: TradingStatus::Open,
            sui_reserve: balance::zero<SUI>(),
            token_supply: 0,
            platform_fee_bps: platform_config::get_default_platform_fee_bps(cfg),
            creator_fee_bps: platform_config::get_default_creator_fee_bps(cfg),
            creator: creator,
            whitelist: vector::empty<address>(),
            m_num,
            m_den,
            treasury: treasury,
            graduation_target_mist: platform_config::get_default_graduation_target_mist(cfg),
            graduated: false,
            lp_seeded: false,
            reward_paid: false,
        }
    }

    public fun freeze_trading<T: drop + store>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::Frozen; }
    public fun initiate_whitelisted_exit<T: drop + store>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::WhitelistedExit; }

    public entry fun create_new_meme_token<T: drop + store>(
        cfg: &PlatformConfig,
        treasury: TreasuryCap<T>,
        ctx: &mut TxContext
    ) {
        if (platform_config::get_creation_is_paused(cfg)) { abort E_CREATION_PAUSED; } else {};
        let creator_addr = sender(ctx);
        let mut curve = init_for_token<T>(cfg, creator_addr, treasury, ctx);
        event::emit(Created { creator: creator_addr });
        transfer::share_object(curve);
    }

    public entry fun create_new_meme_token_with_m<T: drop + store>(
        cfg: &PlatformConfig,
        treasury: TreasuryCap<T>,
        m_num: u64,
        m_den: u64,
        ctx: &mut TxContext
    ) {
        if (platform_config::get_creation_is_paused(cfg)) { abort E_CREATION_PAUSED; } else {};
        let creator_addr = sender(ctx);
        let mut curve = init_for_token_with_m<T>(cfg, creator_addr, treasury, m_num, m_den, ctx);
        event::emit(Created { creator: creator_addr });
        transfer::share_object(curve);
    }

    public entry fun buy<T: drop + store>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        mut payment: Coin<SUI>,
        max_sui_in: u64,
        min_tokens_out: u64,
        deadline_ts_ms: u64,
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

        // Platform and creator fees based on trade size (excluding first_fee)
        let platform_fee = coin::value(&payment) * curve.platform_fee_bps / 10_000;
        let creator_fee = coin::value(&payment) * curve.creator_fee_bps / 10_000;

        if (platform_fee > 0) {
            let fee_coin = coin::split(&mut payment, platform_fee, ctx);
            transfer::public_transfer(fee_coin, platform_config::get_treasury_address(cfg));
        } else { };
        if (creator_fee > 0) {
            let fee_coin = coin::split(&mut payment, creator_fee, ctx);
            transfer::public_transfer(fee_coin, curve.creator);
        } else { };

        // Remaining trade amount
        let trade_in = coin::value(&payment);

        // Compute target s2 via inverse integral, clamped by TOTAL_SUPPLY
        let s1 = curve.token_supply;
        let s2_target = inverse_integral_buy(s1, trade_in, curve.m_num, curve.m_den);
        let s2_clamped = min_u64(s2_target, TOTAL_SUPPLY);
        let tokens_out = s2_clamped - s1;
        if (tokens_out < min_tokens_out || tokens_out == 0) { abort 6; }; // E_MIN_OUT_NOT_MET

        // Compute exact used amount for tokens_out and split refund
        let used_u128 = integrate_cost_u128(s1, s2_clamped, curve.m_num, curve.m_den);
        let used = narrow_u128_to_u64(used_u128);
        let remaining = coin::value(&payment) - used;
        if (remaining > 0) {
            let refund = coin::split(&mut payment, remaining, ctx);
            transfer::public_transfer(refund, sender(ctx));
        } else { };

        // Deposit used amount into reserve
        let deposit = coin::into_balance(payment);
        balance::join(&mut curve.sui_reserve, deposit);

        // Mint tokens as Coin<T> to buyer and update supply
        curve.token_supply = s2_clamped;
        let minted: Coin<T> = coin::mint<T>(&mut curve.treasury, tokens_out, ctx);
        transfer::public_transfer(minted, sender(ctx));
        event::emit(Bought { buyer: sender(ctx), amount_sui: used });
    }

    public entry fun sell<T: drop + store>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        mut tokens: Coin<T>,
        amount_tokens: u64,
        min_sui_out: u64,
        deadline_ts_ms: u64,
        clk: &Clock,
        ctx: &mut TxContext
    ) {
        // Only allow when open or whitelisted exit; if WL, enforce allowlist
        match (curve.status) {
            TradingStatus::Open => { },
            TradingStatus::Frozen => { abort E_TRADING_FROZEN; },
            TradingStatus::WhitelistedExit => {
                let user = sender(ctx);
                if (!is_whitelisted(&curve.whitelist, user)) { abort E_NOT_WHITELISTED; }
            }
        };

        if (clock::timestamp_ms(clk) > deadline_ts_ms) { abort 4; } else {}; // E_DEADLINE_EXPIRED

        // Compute payout and fees
        let s1 = curve.token_supply;
        let s2 = s1 - amount_tokens;
        let gross = narrow_u128_to_u64(integrate_cost_u128(s2, s1, curve.m_num, curve.m_den));

        if (gross < min_sui_out) { abort 7; } else {}; // E_MIN_SUI_OUT_NOT_MET

        let platform_fee = gross * curve.platform_fee_bps / 10_000;
        let creator_fee = gross * curve.creator_fee_bps / 10_000;
        let net = gross - platform_fee - creator_fee;

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
        transfer::public_transfer(payout_coin, sender(ctx));

        if (platform_fee > 0) {
            let fee_bal = balance::split(&mut curve.sui_reserve, platform_fee);
            let fee_coin = coin::from_balance(fee_bal, ctx);
            transfer::public_transfer(fee_coin, platform_config::get_treasury_address(cfg));
        } else {};
        if (creator_fee > 0) {
            let fee_bal = balance::split(&mut curve.sui_reserve, creator_fee);
            let fee_coin = coin::from_balance(fee_bal, ctx);
            transfer::public_transfer(fee_coin, curve.creator);
        } else {};

        curve.token_supply = curve.token_supply - amount_tokens;
        event::emit(Sold { seller: sender(ctx), amount_sui: net });
    }

    public entry fun try_graduate<T: drop + store>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        _ctx: &mut TxContext
    ) {
        if (curve.graduated) { return; } else {};
        if (!(curve.status == TradingStatus::Open)) { abort E_TRADING_FROZEN; } else {};
        let reserve = balance::value<SUI>(&curve.sui_reserve);
        if (reserve < platform_config::get_default_graduation_target_mist(cfg)) { abort 9001; } else {};
        curve.status = TradingStatus::Frozen;
        curve.graduated = true;
        let spot_u64 = spot_price_u64(curve);
        event::emit(GraduationReady { creator: curve.creator, token_supply: curve.token_supply, spot_price_sui_approx: spot_u64 });
    }

    public entry fun distribute_payouts<T: drop + store>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        ctx: &mut TxContext
    ) {
        if (!curve.graduated || curve.reward_paid) { return; } else {};
        let reserve = balance::value<SUI>(&curve.sui_reserve);
        let platform_cut = (reserve * platform_config::get_platform_cut_bps_on_graduation(cfg)) / 10_000;
        let creator_payout = platform_config::get_creator_graduation_payout_mist(cfg);
        let mut remaining = reserve;
        // Platform cut
        if (platform_cut > 0) {
            let bal = balance::split(&mut curve.sui_reserve, platform_cut);
            let c = coin::from_balance(bal, ctx);
            transfer::public_transfer(c, platform_config::get_treasury_address(cfg));
            remaining = remaining - platform_cut;
        };
        // Creator payout (clamp to remaining)
        let payout = if (creator_payout > remaining) { remaining } else { creator_payout };
        if (payout > 0) {
            let bal2 = balance::split(&mut curve.sui_reserve, payout);
            let c2 = coin::from_balance(bal2, ctx);
            transfer::public_transfer(c2, curve.creator);
            remaining = remaining - payout;
        };
        curve.reward_paid = true;
        // Note: remaining SUI stays in reserve for LP seeding
    }

    public entry fun seed_pool_prepare<T: drop + store>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        bump_bps: u64,
        ctx: &mut TxContext
    ) {
        if (!curve.graduated || curve.lp_seeded == true) { abort 9002; } else {};
        let reserve = balance::value<SUI>(&curve.sui_reserve);
        let use_bps = if (bump_bps == 0) { platform_config::get_default_cetus_bump_bps(cfg) } else { bump_bps };
        let p_curve_u128 = spot_price_u128(curve);
        let p_target_u128 = (p_curve_u128 * u128::from_u64(10_000 + use_bps)) / u128::from_u64(10_000);
        let p_target_u64 = narrow_u128_to_u64(p_target_u128);
        // Use all remaining reserve for LP deposit
        let sui_lp = reserve;
        // Tokens needed = sui_lp / p_target
        let mut tokens_needed = sui_lp / p_target_u64;
        let remaining_tokens = TOTAL_SUPPLY - curve.token_supply;
        if (tokens_needed > remaining_tokens) { tokens_needed = remaining_tokens; } else {};
        // Mint tokens for LP to treasury address custody
        let token_lp: Coin<T> = coin::mint<T>(&mut curve.treasury, tokens_needed, ctx);
        curve.token_supply = curve.token_supply + tokens_needed;
        let bal_sui_lp = balance::split(&mut curve.sui_reserve, sui_lp);
        let sui_lp_coin = coin::from_balance(bal_sui_lp, ctx);
        // Transfer both to treasury custody; external bot can add liquidity from there
        let treas = platform_config::get_treasury_address(cfg);
        transfer::public_transfer(token_lp, treas);
        transfer::public_transfer(sui_lp_coin, treas);
        curve.lp_seeded = true;
    }

    public fun spot_price_u128<T: drop + store>(curve: &BondingCurve<T>): u128 {
        // p(s) = (m_num/m_den) * s^2
        let s = curve.token_supply;
        let s128 = u128::from_u64(s);
        (u128::from_u64(curve.m_num) * s128 * s128) / u128::from_u64(curve.m_den)
    }

    public fun spot_price_u64<T: drop + store>(curve: &BondingCurve<T>): u64 { narrow_u128_to_u64(spot_price_u128(curve)) }

    public fun minted_supply<T: drop + store>(curve: &BondingCurve<T>): u64 { curve.token_supply }

    public entry fun withdraw_reserve_to_treasury<T: store>(
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

    public entry fun withdraw_reserve_to<T: store>(
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

    public fun add_to_whitelist<T: store>(_admin: &AdminCap, curve: &mut BondingCurve<T>, user: address) {
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

    // Integral helper: returns cost to move supply from s1 to s2 under p(s)=m*s^2
    fun integrate_cost_u128(s1: u64, s2: u64, m_num: u64, m_den: u64): u128 {
        let s1c = pow3_u128_from_u64(s1);
        let s2c = pow3_u128_from_u64(s2);
        let delta = s2c - s1c; // s2 >= s1 in buy; in sell we pass (s2,s1)
        (u128::from_u64(m_num) * delta) / (u128::from_u64(3) * u128::from_u64(m_den))
    }

    // Inverse: given s1 and amount_in, compute maximal s2 such that cost <= amount_in
    fun inverse_integral_buy(s1: u64, amount_in: u64, m_num: u64, m_den: u64): u64 {
        let s1c = pow3_u128_from_u64(s1);
        let add = (u128::from_u64(3) * u128::from_u64(amount_in) * u128::from_u64(m_den)) / u128::from_u64(m_num); // floor to keep cost <= amount_in
        let x = s1c + add;
        cbrt_floor_u64(x)
    }

    fun pow3_u128_from_u64(x: u64): u128 {
        let x128 = u128::from_u64(x);
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
        let max64 = u128::from_u64(u64::max_value!());
        if (x > max64) { u64::max_value!() } else { u64::from_u128(x) }
    }

    fun min_u64(a: u64, b: u64): u64 { if (a < b) { a } else { b } }

    // split_tokens and burn_tokens removed; Coin<T> is used directly
}
