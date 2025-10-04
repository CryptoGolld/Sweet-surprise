module suilfg_launch::bonding_curve {
    use sui::object::{UID};
    use sui::object;
    use sui::tx_context::{TxContext, sender};
    use sui::transfer;
    use sui::balance::{Self as balance, Balance};
    use sui::coin::{Self as coin, Coin};
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

    public struct BondingCurve<phantom T: drop, store> has key, store {
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
        // Permissionless graduation parameters
        graduation_target_mist: u64,
        graduated: bool,
        lp_seeded: bool,
        reward_paid: bool,
    }

    public struct TokenCoin<phantom T: store> has key, store {
        id: UID,
        amount: u64,
    }

    public struct Created has copy, drop { creator: address }
    public struct Bought has copy, drop { buyer: address, amount_sui: u64 }
    public struct Sold has copy, drop { seller: address, amount_sui: u64 }
    public struct Graduated has copy, drop { creator: address, reward_sui: u64, treasury: address }
    public struct GraduationReady has copy, drop { creator: address, token_supply: u64, spot_price_sui_approx: u64 }

    const E_CREATION_PAUSED: u64 = 1;
    const E_TRADING_FROZEN: u64 = 2;
    const E_NOT_WHITELISTED: u64 = 3;

    fun init_for_token<T: drop + store>(cfg: &PlatformConfig, creator: address, ctx: &mut TxContext): BondingCurve<T> {
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
            graduation_target_mist: platform_config::get_default_graduation_target_mist(cfg),
            graduated: false,
            lp_seeded: false,
            reward_paid: false,
        }
    }

    fun init_for_token_with_m<T: drop + store>(cfg: &PlatformConfig, creator: address, m_num: u64, m_den: u64, ctx: &mut TxContext): BondingCurve<T> {
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
            graduation_target_mist: platform_config::get_default_graduation_target_mist(cfg),
            graduated: false,
            lp_seeded: false,
            reward_paid: false,
        }
    }

    public fun freeze_trading<T: store>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::Frozen; }
    public fun initiate_whitelisted_exit<T: store>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::WhitelistedExit; }

    public entry fun create_new_meme_token<T: store>(
        cfg: &PlatformConfig,
        ctx: &mut TxContext
    ) {
        if (platform_config::get_creation_is_paused(cfg)) { abort E_CREATION_PAUSED; } else {};
        let creator_addr = sender(ctx);
        let mut curve = init_for_token<T>(cfg, creator_addr, ctx);
        event::emit(Created { creator: creator_addr });
        transfer::share_object(curve);
    }

    public entry fun create_new_meme_token_with_m<T: store>(
        cfg: &PlatformConfig,
        m_num: u64,
        m_den: u64,
        ctx: &mut TxContext
    ) {
        if (platform_config::get_creation_is_paused(cfg)) { abort E_CREATION_PAUSED; } else {};
        let creator_addr = sender(ctx);
        let mut curve = init_for_token_with_m<T>(cfg, creator_addr, m_num, m_den, ctx);
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

        // Mint token coins to buyer and update supply
        curve.token_supply = s2_clamped;
        let minted = TokenCoin<T> { id: object::new(ctx), amount: tokens_out };
        transfer::public_transfer(minted, sender(ctx));
        event::emit(Bought { buyer: sender(ctx), amount_sui: used });
    }

    public entry fun sell<T: drop + store>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        mut tokens: TokenCoin<T>,
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
        if (tokens.amount == amount_tokens) {
            let _burned = burn_tokens<T>(tokens);
        } else {
            let to_burn = split_tokens<T>(&mut tokens, amount_tokens, ctx);
            let _burned = burn_tokens<T>(to_burn);
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

    public fun graduate_to_cetus<T: drop + store>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        _ctx: &mut TxContext
    ) {
        // Freeze trading and emit a readiness signal including current spot price and supply
        curve.status = TradingStatus::Frozen;
        let spot_u64 = spot_price_u64(curve);
        event::emit(GraduationReady { creator: curve.creator, token_supply: curve.token_supply, spot_price_sui_approx: spot_u64 });
        // Separate event to drive bot payout logic (optional):
        event::emit(Graduated { creator: curve.creator, reward_sui: platform_config::get_graduation_reward_sui(cfg), treasury: platform_config::get_treasury_address(cfg) });
    }

    public fun spot_price_u128<T: drop + store>(curve: &BondingCurve<T>): u128 {
        // p(s) = (m_num/m_den) * s^2
        let s = curve.token_supply;
        let s128 = u64::into_u128(s);
        (u64::into_u128(curve.m_num) * s128 * s128) / u64::into_u128(curve.m_den)
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
        (u64::into_u128(m_num) * delta) / (u64::into_u128(3) * u64::into_u128(m_den))
    }

    // Inverse: given s1 and amount_in, compute maximal s2 such that cost <= amount_in
    fun inverse_integral_buy(s1: u64, amount_in: u64, m_num: u64, m_den: u64): u64 {
        let s1c = pow3_u128_from_u64(s1);
        let add = (u64::into_u128(3) * u64::into_u128(amount_in) * u64::into_u128(m_den)) / u64::into_u128(m_num); // floor to keep cost <= amount_in
        let x = s1c + add;
        cbrt_floor_u64(x)
    }

    fun pow3_u128_from_u64(x: u64): u128 {
        let x128 = u64::into_u128(x);
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
        let max64 = u64::into_u128(u64::max_value!());
        if (x > max64) { u64::max_value!() } else { u128::into_u64(x) }
    }

    fun min_u64(a: u64, b: u64): u64 { if (a < b) { a } else { b } }

    public fun split_tokens<T: store>(tokens: &mut TokenCoin<T>, amount: u64, ctx: &mut TxContext): TokenCoin<T> {
        assert!(amount <= tokens.amount, 8); // E_INSUFFICIENT_TOKENS
        tokens.amount = tokens.amount - amount;
        TokenCoin<T> { id: object::new(ctx), amount }
    }

    public fun burn_tokens<T: store>(tokens: TokenCoin<T>): u64 {
        let TokenCoin { id, amount } = tokens;
        object::delete(id);
        amount
    }
}
