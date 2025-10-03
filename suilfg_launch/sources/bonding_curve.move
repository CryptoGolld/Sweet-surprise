module suilfg_launch::bonding_curve {
    use sui::object::{self, UID};
    use sui::tx_context::{TxContext, sender};
    use sui::transfer;
    use sui::balance::{Self as balance, Balance};
    use sui::coin::{Self as coin, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::clock::{Self as clock, Clock};
    use std::vector;
    use std::option::{Self as opt, Option};

    use std::u128;
    use std::u64;

    use crate::platform_config::{self as platform_config, PlatformConfig, AdminCap};

    const TOTAL_SUPPLY: u64 = 1_000_000_000;

    enum TradingStatus { Open, Frozen, WhitelistedExit }

    struct BondingCurve<T: store> has key, store {
        id: UID,
        status: TradingStatus,
        sui_reserve: Balance<SUI>,
        token_supply: u64,
        platform_fee_bps: u64,
        creator_fee_bps: u64,
        creator: address,
        whitelist: vector<address>,
        m_num: u128, // numerator for price coefficient m
        m_den: u128, // denominator for price coefficient m
        // For simplicity in this stub, we don’t model the token type mint/burn
    }

    public struct TokenCoin<T: store> has key, store {
        id: UID,
        amount: u64,
    }

    struct Created has copy, drop { creator: address }
    struct Bought has copy, drop { buyer: address, amount_sui: u64 }
    struct Sold has copy, drop { seller: address, amount_sui: u64 }
    struct Graduated has copy, drop { creator: address, reward_sui: u64, treasury: address }

    const E_CREATION_PAUSED: u64 = 1;
    const E_TRADING_FROZEN: u64 = 2;
    const E_NOT_WHITELISTED: u64 = 3;

    fun init_for_token<T: store>(cfg: &PlatformConfig, creator: address, ctx: &mut TxContext): BondingCurve<T> {
        BondingCurve<T> {
            id: object::new(ctx),
            status: TradingStatus::Open,
            sui_reserve: balance::zero<SUI>(),
            token_supply: 0,
            platform_fee_bps: platform_config::get_default_platform_fee_bps(cfg),
            creator_fee_bps: platform_config::get_default_creator_fee_bps(cfg),
            creator: creator,
            whitelist: vector::empty<address>(),
            m_num: 1, // default m = 1/1; calibrate via admin later if needed
            m_den: 1,
        }
    }

    public entry fun freeze_trading<T: store>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::Frozen; }
    public entry fun initiate_whitelisted_exit<T: store>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::WhitelistedExit; }

    public entry fun create_new_meme_token<T: store>(
        cfg: &PlatformConfig,
        mut creator_buy_payment: Option<Coin<SUI>>, // None => no auto-buy; Some(payment) => perform first buy
        max_sui_in: u64,
        min_tokens_out: u64,
        deadline_ts_ms: u64,
        clk: &Clock,
        ctx: &mut TxContext
    ) {
        if (platform_config::get_creation_is_paused(cfg)) { abort E_CREATION_PAUSED; }
        let creator_addr = sender(ctx);
        let mut curve = init_for_token<T>(cfg, creator_addr, ctx);
        event::emit(Created { creator: creator_addr });
        if (opt::is_some(&creator_buy_payment)) {
            let payment = opt::extract(&mut creator_buy_payment);
            buy::<T>(cfg, &mut curve, payment, max_sui_in, min_tokens_out, deadline_ts_ms, clk, ctx);
        };
        transfer::share_object(curve);
    }

    public entry fun buy<T: store>(
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
        match curve.status { TradingStatus::Open => {}, TradingStatus::Frozen => abort E_TRADING_FROZEN, TradingStatus::WhitelistedExit => abort E_TRADING_FROZEN };

        // Deadline check
        if (clock::timestamp_ms(clk) > deadline_ts_ms) { abort 4 } // E_DEADLINE_EXPIRED

        let gross_in = coin::value(&payment);
        if (gross_in > max_sui_in) { abort 5 } // E_MAX_IN_EXCEEDED

        // First buyer fee if first-ever buy
        if (curve.token_supply == 0) {
            let fee = platform_config::get_first_buyer_fee_mist(cfg);
            if (fee > 0) {
                let fee_coin = coin::split(&mut payment, fee);
                transfer::public_transfer(fee_coin, platform_config::get_treasury_address(cfg));
            }
        }

        // Platform and creator fees based on trade size (excluding first_fee)
        let platform_fee = coin::value(&payment) * curve.platform_fee_bps / 10_000;
        let creator_fee = coin::value(&payment) * curve.creator_fee_bps / 10_000;

        if (platform_fee > 0) {
            let fee_coin = coin::split(&mut payment, platform_fee);
            transfer::public_transfer(fee_coin, platform_config::get_treasury_address(cfg));
        }
        if (creator_fee > 0) {
            let fee_coin = coin::split(&mut payment, creator_fee);
            transfer::public_transfer(fee_coin, curve.creator);
        }

        // Remaining trade amount
        let trade_in = coin::value(&payment);

        // Compute target s2 via inverse integral, clamped by TOTAL_SUPPLY
        let s1 = curve.token_supply;
        let s2_target = inverse_integral_buy(s1, trade_in, curve.m_num, curve.m_den);
        let s2_clamped = min_u64(s2_target, TOTAL_SUPPLY);
        let tokens_out = s2_clamped - s1;
        if (tokens_out < min_tokens_out || tokens_out == 0) { abort 6 } // E_MIN_OUT_NOT_MET

        // Compute exact used amount for tokens_out and split refund
        let used_u128 = integrate_cost_u128(s1, s2_clamped, curve.m_num, curve.m_den);
        let used = narrow_u128_to_u64(used_u128);
        let remaining = coin::value(&payment) - used;
        if (remaining > 0) {
            let refund = coin::split(&mut payment, remaining);
            transfer::public_transfer(refund, sender(ctx));
        }

        // Deposit used amount into reserve
        let deposit = coin::into_balance(payment);
        balance::join(&mut curve.sui_reserve, deposit);

        // Mint token coins to buyer and update supply
        curve.token_supply = s2_clamped;
        let minted = TokenCoin<T> { id: object::new(ctx), amount: tokens_out };
        transfer::public_transfer(minted, sender(ctx));
        event::emit(Bought { buyer: sender(ctx), amount_sui: used });
    }

    public entry fun sell<T: store>(
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
        match curve.status {
            TradingStatus::Open => {},
            TradingStatus::Frozen => abort E_TRADING_FROZEN,
            TradingStatus::WhitelistedExit => {
                let user = sender(ctx);
                if (!is_whitelisted(&curve.whitelist, user)) { abort E_NOT_WHITELISTED; }
            }
        };

        if (clock::timestamp_ms(clk) > deadline_ts_ms) { abort 4 } // E_DEADLINE_EXPIRED

        // Compute payout and fees
        let s1 = curve.token_supply;
        let s2 = s1 - amount_tokens;
        let gross_u128 = integrate_cost_u128(s2, s1, curve.m_num, curve.m_den);
        let gross = narrow_u128_to_u64(gross_u128);

        if (gross < min_sui_out) { abort 7 } // E_MIN_SUI_OUT_NOT_MET

        let platform_fee = gross * curve.platform_fee_bps / 10_000;
        let creator_fee = gross * curve.creator_fee_bps / 10_000;
        let net = gross - platform_fee - creator_fee;

        // Burn the tokens being sold; if needed, split first
        if (tokens.amount == amount_tokens) {
            let _burned = burn_tokens::<T>(tokens);
        } else {
            let to_burn = split_tokens::<T>(&mut tokens, amount_tokens, ctx);
            let _burned = burn_tokens::<T>(to_burn);
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
        }
        if (creator_fee > 0) {
            let fee_bal = balance::split(&mut curve.sui_reserve, creator_fee);
            let fee_coin = coin::from_balance(fee_bal, ctx);
            transfer::public_transfer(fee_coin, curve.creator);
        }

        curve.token_supply = curve.token_supply - amount_tokens;
        event::emit(Sold { seller: sender(ctx), amount_sui: net });
    }

    public entry fun graduate_to_cetus<T: store>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        _ctx: &mut TxContext
    ) {
        // Emit Graduated event. Off-chain bot should transfer reward from treasury to creator upon seeing this event.
        event::emit(Graduated { creator: curve.creator, reward_sui: platform_config::get_graduation_reward_sui(cfg), treasury: platform_config::get_treasury_address(cfg) });
    }

    public entry fun add_to_whitelist<T: store>(_admin: &AdminCap, curve: &mut BondingCurve<T>, user: address) {
        vector::push_back(&mut curve.whitelist, user);
    }

    fun is_whitelisted(list: &vector<address>, user: address): bool {
        let len = vector::length<address>(list);
        let mut i = 0;
        while (i < len) {
            if (*vector::borrow<address>(list, i) == user) { return true }
            i = i + 1;
        };
        false
    }

    // Integral helper: returns cost to move supply from s1 to s2 under p(s)=m*s^2
    fun integrate_cost_u128(s1: u64, s2: u64, m_num: u128, m_den: u128): u128 {
        let s1c = pow3_u128_from_u64(s1);
        let s2c = pow3_u128_from_u64(s2);
        let delta = s2c - s1c; // s2 >= s1 in buy; in sell we pass (s2,s1)
        (m_num * delta) / (3 * m_den)
    }

    // Inverse: given s1 and amount_in, compute maximal s2 such that cost <= amount_in
    fun inverse_integral_buy(s1: u64, amount_in: u64, m_num: u128, m_den: u128): u64 {
        let s1c = pow3_u128_from_u64(s1);
        let add = (3 * u128::from_u64(amount_in) * m_den) / m_num; // floor to keep cost <= amount_in
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
        // Assumes x fits into u64 in practice; if not, clamps to u64::max
        let max64 = u128::from_u64(u64::max_value());
        if (x > max64) { u64::max_value() } else { u64::from_u128(x) }
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
