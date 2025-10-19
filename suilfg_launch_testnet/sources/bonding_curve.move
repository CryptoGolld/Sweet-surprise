/// Bonding Curve for Meme Token Launch - TESTNET VERSION
/// Uses Simple AMM for graduation (no Cetus dependency)
module suilfg_launch::bonding_curve {
    use sui::object::{Self as object, UID, id_address};
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
    use std::string;
    use std::option::{Self as option, Option};
    use std::type_name::{Self, TypeName};

    use suilfg_launch::platform_config as platform_config;
    use suilfg_launch::platform_config::{PlatformConfig, AdminCap};
    use suilfg_launch::referral_registry::{Self, ReferralRegistry};
    
    // Simple AMM for testnet graduation (TEMPORARILY COMMENTED FOR BASIC TESTING)
    // use suilfg_launch::simple_amm;

    const TOTAL_SUPPLY: u64 = 1_000_000_000;

    public enum TradingStatus has copy, drop, store { Open, Frozen, WhitelistedExit }

    public struct BondingCurve<phantom T: drop> has key, store {
        id: UID,
        status: TradingStatus,
        sui_reserve: Balance<SUI>,
        token_supply: u64,
        platform_fee_bps: u64,
        creator_fee_bps: u64,
        creator: address,
        whitelist: vector<address>,
        m_num: u64,
        m_den: u128,
        base_price_mist: u64,
        treasury: TreasuryCap<T>,
        graduation_target_mist: u64,
        graduated: bool,
        lp_seeded: bool,
        reward_paid: bool,
        lp_fee_recipient: address,
    }

    // Events
    public struct Created has copy, drop { creator: address }
    public struct Bought has copy, drop { buyer: address, amount_sui: u64, referrer: address }
    public struct Sold has copy, drop { seller: address, amount_sui: u64, referrer: address }
    public struct Graduated has copy, drop { creator: address, reward_sui: u64, treasury: address }
    public struct GraduationReady has copy, drop { creator: address, token_supply: u64, spot_price_sui_approx: u64 }
    public struct PoolCreated has copy, drop { 
        pool_type: string::String,
        sui_amount: u64,
        token_amount: u64,
        pool_id: address,
    }

    // Errors
    const E_CREATION_PAUSED: u64 = 1;
    const E_TRADING_FROZEN: u64 = 2;
    const E_NOT_WHITELISTED: u64 = 3;
    const E_NOT_GRADUATED: u64 = 4;
    const E_LP_ALREADY_SEEDED: u64 = 5;

    fun init_for_token<T: drop>(cfg: &PlatformConfig, creator: address, treasury: TreasuryCap<T>, ctx: &mut TxContext): BondingCurve<T> {
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
            base_price_mist: platform_config::get_default_base_price_mist(cfg),
            treasury: treasury,
            graduation_target_mist: platform_config::get_default_graduation_target_mist(cfg),
            graduated: false,
            lp_seeded: false,
            reward_paid: false,
            lp_fee_recipient: platform_config::get_lp_recipient_address(cfg),
        }
    }

    fun init_for_token_with_m<T: drop>(
        cfg: &PlatformConfig,
        creator: address,
        treasury: TreasuryCap<T>,
        m_num: u64,
        m_den: u128,
        ctx: &mut TxContext
    ): BondingCurve<T> {
        let mut curve = init_for_token<T>(cfg, creator, treasury, ctx);
        curve.m_num = m_num;
        curve.m_den = m_den;
        curve
    }

    public fun freeze_trading<T: drop>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::Frozen; }
    public fun initiate_whitelisted_exit<T: drop>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::WhitelistedExit; }

    public entry fun create_new_meme_token<T: drop>(
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

    public entry fun create_new_meme_token_with_m<T: drop>(
        cfg: &PlatformConfig,
        treasury: TreasuryCap<T>,
        m_num: u64,
        m_den: u128,
        ctx: &mut TxContext
    ) {
        if (platform_config::get_creation_is_paused(cfg)) { abort E_CREATION_PAUSED; } else {};
        let creator_addr = sender(ctx);
        let mut curve = init_for_token_with_m<T>(cfg, creator_addr, treasury, m_num, m_den, ctx);
        event::emit(Created { creator: creator_addr });
        transfer::share_object(curve);
    }

    public entry fun buy<T: drop>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        referral_registry: &mut ReferralRegistry,
        mut payment: Coin<SUI>,
        max_sui_in: u64,
        min_tokens_out: u64,
        deadline_ts_ms: u64,
        referrer: Option<address>,
        clk: &Clock,
        ctx: &mut TxContext
    ) {
        // Only allow when open
        if (curve.status != TradingStatus::Open) { abort E_TRADING_FROZEN; } else {};
        let now_ms = clock::timestamp_ms(clk);
        if (now_ms > deadline_ts_ms) { abort 1001; } else {};

        let buyer_addr = sender(ctx);
        let payment_amount = coin::value(&payment);
        if (payment_amount > max_sui_in) { abort 1002; } else {};

        // Register referral if provided
        if (option::is_some(&referrer)) {
            let ref_addr = option::destroy_some(referrer);
            if (ref_addr != @0x0 && ref_addr != buyer_addr) {
                referral_registry::try_register(referral_registry, buyer_addr, ref_addr, clock::timestamp_ms(clk));
            };
        } else {
            option::destroy_none(referrer);
        };

        let referrer_opt = referral_registry::get_referrer(referral_registry, buyer_addr);
        let has_referrer = option::is_some(&referrer_opt);
        let referrer_addr = if (has_referrer) { option::destroy_some(referrer_opt) } else { option::destroy_none(referrer_opt); @0x0 };

        // Calculate fees
        let platform_fee = (payment_amount * curve.platform_fee_bps) / 10_000;
        let creator_fee = (payment_amount * curve.creator_fee_bps) / 10_000;
        let referrer_fee = if (has_referrer) {
            (platform_fee * platform_config::get_referral_fee_bps(cfg)) / 10_000
        } else { 0 };
        let total_fees = platform_fee + creator_fee;
        let net_sui_for_reserve = payment_amount - total_fees;

        // Calculate tokens to mint
        let tokens_to_mint = calculate_tokens_for_sui(curve, net_sui_for_reserve);
        if (tokens_to_mint < min_tokens_out) { abort 1003; } else {};

        // Take fees
        if (platform_fee > 0) {
            let mut platform_coin = coin::split(&mut payment, platform_fee, ctx);
            if (referrer_fee > 0) {
                let ref_coin = coin::split(&mut platform_coin, referrer_fee, ctx);
                transfer::public_transfer(ref_coin, referrer_addr);
                transfer::public_transfer(platform_coin, platform_config::get_treasury_address(cfg));
            } else {
                transfer::public_transfer(platform_coin, platform_config::get_treasury_address(cfg));
            };
        };
        if (creator_fee > 0) {
            let creator_coin = coin::split(&mut payment, creator_fee, ctx);
            transfer::public_transfer(creator_coin, curve.creator);
        };

        // Add to reserve
        let reserve_balance = coin::into_balance(payment);
        balance::join(&mut curve.sui_reserve, reserve_balance);

        // Mint tokens
        let new_tokens = coin::mint<T>(&mut curve.treasury, tokens_to_mint, ctx);
        curve.token_supply = curve.token_supply + tokens_to_mint;

        transfer::public_transfer(new_tokens, buyer_addr);
        event::emit(Bought { buyer: buyer_addr, amount_sui: payment_amount, referrer: referrer_addr });
    }

    public entry fun sell<T: drop>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        referral_registry: &mut ReferralRegistry,
        tokens: Coin<T>,
        min_sui_out: u64,
        deadline_ts_ms: u64,
        clk: &Clock,
        ctx: &mut TxContext
    ) {
        if (curve.status != TradingStatus::Open && curve.status != TradingStatus::WhitelistedExit) {
            abort E_TRADING_FROZEN;
        } else {};
        let seller_addr = sender(ctx);
        if (curve.status == TradingStatus::WhitelistedExit) {
            if (!vector::contains(&curve.whitelist, &seller_addr)) {
                abort E_NOT_WHITELISTED;
            };
        };

        let now_ms = clock::timestamp_ms(clk);
        if (now_ms > deadline_ts_ms) { abort 2001; } else {};

        let token_amount = coin::value(&tokens);
        let gross_sui = calculate_sui_for_tokens(curve, token_amount);
        if (gross_sui < min_sui_out) { abort 2002; } else {};

        let referrer_opt = referral_registry::get_referrer(referral_registry, seller_addr);
        let has_referrer = option::is_some(&referrer_opt);
        let referrer_addr = if (has_referrer) { option::destroy_some(referrer_opt) } else { option::destroy_none(referrer_opt); @0x0 };

        // Calculate fees
        let platform_fee = (gross_sui * curve.platform_fee_bps) / 10_000;
        let creator_fee = (gross_sui * curve.creator_fee_bps) / 10_000;
        let referrer_fee = if (has_referrer) {
            (platform_fee * platform_config::get_referral_fee_bps(cfg)) / 10_000
        } else { 0 };
        let total_fees = platform_fee + creator_fee;
        let net_sui = gross_sui - total_fees;

        // Burn tokens
        coin::burn(&mut curve.treasury, tokens);
        curve.token_supply = curve.token_supply - token_amount;

        // Remove from reserve
        let sui_balance = balance::split(&mut curve.sui_reserve, gross_sui);
        let mut sui_coin = coin::from_balance(sui_balance, ctx);

        // Send fees
        if (platform_fee > 0) {
            let mut platform_coin = coin::split(&mut sui_coin, platform_fee, ctx);
            if (referrer_fee > 0) {
                let ref_coin = coin::split(&mut platform_coin, referrer_fee, ctx);
                transfer::public_transfer(ref_coin, referrer_addr);
                transfer::public_transfer(platform_coin, platform_config::get_treasury_address(cfg));
            } else {
                transfer::public_transfer(platform_coin, platform_config::get_treasury_address(cfg));
            };
        };
        if (creator_fee > 0) {
            let creator_coin = coin::split(&mut sui_coin, creator_fee, ctx);
            transfer::public_transfer(creator_coin, curve.creator);
        };

        transfer::public_transfer(sui_coin, seller_addr);
        event::emit(Sold { seller: seller_addr, amount_sui: gross_sui, referrer: referrer_addr });
    }

    fun calculate_tokens_for_sui<T: drop>(curve: &BondingCurve<T>, sui_in: u64): u64 {
        let s0 = (curve.token_supply as u128);
        let r = (sui_in as u128);
        let m_num_u128 = (curve.m_num as u128);
        let m_den_u128 = curve.m_den;
        let delta_s_num = 2 * m_den_u128 * r;
        let delta_s_denom = 2 * m_num_u128 * s0 + m_num_u128;
        let delta_s = (delta_s_num / delta_s_denom);
        narrow_u128_to_u64(delta_s)
    }

    fun calculate_sui_for_tokens<T: drop>(curve: &BondingCurve<T>, token_in: u64): u64 {
        let s0 = (curve.token_supply as u128);
        let delta_s = (token_in as u128);
        let m_num_u128 = (curve.m_num as u128);
        let m_den_u128 = curve.m_den;
        let delta_r_num = (2 * m_num_u128 * s0 * delta_s) - (m_num_u128 * delta_s * delta_s);
        let delta_r_denom = 2 * m_den_u128;
        let delta_r = (delta_r_num / delta_r_denom);
        narrow_u128_to_u64(delta_r)
    }

    fun narrow_u128_to_u64(x: u128): u64 {
        if (x > (std::u64::max_value!() as u128)) {
            std::u64::max_value!()
        } else {
            (x as u64)
        }
    }

    fun spot_price_u128<T: drop>(curve: &BondingCurve<T>): u128 {
        let s = (curve.token_supply as u128);
        let m_num_u128 = (curve.m_num as u128);
        let m_den_u128 = curve.m_den;
        let numerator = m_num_u128 * s;
        let denominator = m_den_u128;
        (numerator / denominator)
    }

    fun spot_price_u64<T: drop>(curve: &BondingCurve<T>): u64 {
        narrow_u128_to_u64(spot_price_u128(curve))
    }

    fun min_u64(a: u64, b: u64): u64 { if (a < b) { a } else { b } }

    public entry fun mark_graduation_ready<T: drop>(curve: &mut BondingCurve<T>, cfg: &PlatformConfig) {
        if (curve.graduated) { return; } else {};
        let reserve = balance::value<SUI>(&curve.sui_reserve);
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
        let reserve = balance::value<SUI>(&curve.sui_reserve);
        let platform_cut = (reserve * platform_config::get_platform_cut_bps_on_graduation(cfg)) / 10_000;
        let creator_payout = platform_config::get_creator_graduation_payout_mist(cfg);
        
        if (platform_cut > 0) {
            let platform_balance = balance::split(&mut curve.sui_reserve, platform_cut);
            let mut platform_coin = coin::from_balance(platform_balance, ctx);
            
            if (creator_payout > 0 && creator_payout <= platform_cut) {
                let creator_coin = coin::split(&mut platform_coin, creator_payout, ctx);
                transfer::public_transfer(creator_coin, curve.creator);
            };
            
            transfer::public_transfer(platform_coin, platform_config::get_treasury_address(cfg));
        };
        
        curve.reward_paid = true;
    }

    /*
    /// Graduate to Simple AMM pool (TESTNET VERSION) - TEMPORARILY COMMENTED FOR TESTING
    public entry fun graduate_to_simple_amm<T: drop>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        ctx: &mut TxContext
    ) {
        assert!(curve.graduated, E_NOT_GRADUATED);
        assert!(!curve.lp_seeded, E_LP_ALREADY_SEEDED);
        
        // 1. Mint team allocation
        let team_allocation = platform_config::get_team_allocation_tokens(cfg);
        let team_tokens = coin::mint(&mut curve.treasury, team_allocation, ctx);
        let team_recipient = platform_config::get_treasury_address(cfg);
        transfer::public_transfer(team_tokens, team_recipient);
        curve.token_supply = curve.token_supply + team_allocation;
        
        // 2. Prepare liquidity
        let total_sui_mist = balance::value(&curve.sui_reserve);
        let sui_for_lp = total_sui_mist;
        let remaining_supply = TOTAL_SUPPLY - curve.token_supply;
        let token_for_lp = remaining_supply;
        
        let lp_token_coin = coin::mint(&mut curve.treasury, token_for_lp, ctx);
        let lp_token_balance = coin::into_balance(lp_token_coin);
        let lp_sui_balance = balance::split(&mut curve.sui_reserve, sui_for_lp);
        curve.token_supply = curve.token_supply + token_for_lp;
        
        // 3. Create simple AMM pool
        let lp_position = simple_amm::create_pool<T>(
            lp_token_balance,
            lp_sui_balance,
            ctx
        );
        
        let pool_id_addr = simple_amm::get_pool_id(&lp_position);
        
        // 4. Share LP position (permanent lock!)
        simple_amm::share_lp_position(lp_position);
        
        curve.lp_seeded = true;
        
        event::emit(PoolCreated {
            pool_type: string::utf8(b"SimpleAMM"),
            sui_amount: sui_for_lp,
            token_amount: token_for_lp,
            pool_id: pool_id_addr,
        });
    }

    // View functions
    public fun get_sui_reserve<T: drop>(curve: &BondingCurve<T>): u64 { balance::value(&curve.sui_reserve) }
    public fun get_token_supply<T: drop>(curve: &BondingCurve<T>): u64 { curve.token_supply }
    public fun get_creator<T: drop>(curve: &BondingCurve<T>): address { curve.creator }
    public fun is_graduated<T: drop>(curve: &BondingCurve<T>): bool { curve.graduated }
    public fun is_lp_seeded<T: drop>(curve: &BondingCurve<T>): bool { curve.lp_seeded }
    public fun get_status<T: drop>(curve: &BondingCurve<T>): TradingStatus { curve.status }
}
