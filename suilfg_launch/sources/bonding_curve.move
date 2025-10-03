module suilfg_launch::bonding_curve {
    use sui::object::{self, UID};
    use sui::tx_context::{TxContext, sender};
    use sui::transfer;
    use sui::balance::{Self as balance, Balance};
    use sui::coin::{Self as coin, Coin};
    use sui::sui::SUI;
    use sui::event;

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
        // For simplicity in this stub, we don’t model the token type mint/burn
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
        }
    }

    public entry fun freeze_trading<T: store>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::Frozen; }
    public entry fun initiate_whitelisted_exit<T: store>(_admin: &AdminCap, curve: &mut BondingCurve<T>) { curve.status = TradingStatus::WhitelistedExit; }

    public entry fun create_new_meme_token<T: store>(
        cfg: &PlatformConfig,
        _creator_buy_amount: u64,
        ctx: &mut TxContext
    ) {
        if (platform_config::get_creation_is_paused(cfg)) { abort E_CREATION_PAUSED; }
        let creator_addr = sender(ctx);
        let curve = init_for_token<T>(cfg, creator_addr, ctx);
        event::emit(Created { creator: creator_addr });
        // NOTE: Creator auto-buy should be batched by the frontend in same PTB via calling `buy`
        transfer::share_object(curve);
    }

    public entry fun buy<T: store>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // Only allow when open
        match curve.status { TradingStatus::Open => {}, TradingStatus::Frozen => abort E_TRADING_FROZEN, TradingStatus::WhitelistedExit => abort E_TRADING_FROZEN };

        let total_in = coin::value(&payment);

        // First buyer fee if first-ever buy
        let mut first_fee = 0;
        if (curve.token_supply == 0) {
            first_fee = platform_config::get_first_buyer_fee_mist(cfg);
            if (first_fee > 0) {
                let fee_coin = coin::split(&mut payment, first_fee);
                transfer::public_transfer(fee_coin, platform_config::get_treasury_address(cfg));
            }
        }

        // Platform and creator fees based on trade size (excluding first_fee)
        let mut trade_amount = coin::value(&payment);
        let platform_fee = trade_amount * curve.platform_fee_bps / 10_000;
        let creator_fee = trade_amount * curve.creator_fee_bps / 10_000;

        if (platform_fee > 0) {
            let fee_coin = coin::split(&mut payment, platform_fee);
            transfer::public_transfer(fee_coin, platform_config::get_treasury_address(cfg));
        }
        if (creator_fee > 0) {
            let fee_coin = coin::split(&mut payment, creator_fee);
            transfer::public_transfer(fee_coin, curve.creator);
        }

        // Remainder goes into the curve reserve
        let deposit = coin::into_balance(payment);
        balance::join(&mut curve.sui_reserve, deposit);

        // Compute tokens out via exponential integral (stubbed)
        let tokens_out = calculate_tokens_out(curve.token_supply, balance::value(&curve.sui_reserve), total_in);
        curve.token_supply = curve.token_supply + tokens_out;
        event::emit(Bought { buyer: sender(ctx), amount_sui: total_in });
    }

    public entry fun sell<T: store>(
        cfg: &PlatformConfig,
        curve: &mut BondingCurve<T>,
        amount_tokens: u64,
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

        // Compute payout (stubbed) and fees
        let gross = calculate_sui_out(curve.token_supply, balance::value(&curve.sui_reserve), amount_tokens);
        let platform_fee = gross * curve.platform_fee_bps / 10_000;
        let creator_fee = gross * curve.creator_fee_bps / 10_000;
        let net = gross - platform_fee - creator_fee;

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

    // Placeholder pricing functions to be implemented with exponential integral
    fun calculate_tokens_out(_current_supply: u64, _current_reserve: u64, _sui_in: u64): u64 { 0 }
    fun calculate_sui_out(_current_supply: u64, _current_reserve: u64, _tokens_in: u64): u64 { 0 }
}
