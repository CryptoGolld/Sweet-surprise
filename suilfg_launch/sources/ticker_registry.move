module suilfg_launch::ticker_registry {
    use sui::object::{self, UID, ID};
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::table::{Table};
    use sui::table as table;
    use sui::string::String;
    use sui::option::{Self as opt, Option};
    use sui::clock::Clock;
    use sui::vector;

    use crate::platform_config::AdminCap;

    enum TickerStatus { Available, Active, OnCooldown, Banned, Reserved, Whitelisted }

    struct TickerInfo has store {
        status: TickerStatus,
        token_id: Option<ID>,
        cooldown_ends_ts_ms: u64,
        whitelist: vector<address>,
    }

    struct TickerRegistry has key {
        id: UID,
        tickers: Table<String, TickerInfo>,
        default_cooldown_ms: u64,
    }

    struct Auction has key, store {
        id: UID,
        ticker_symbol: String,
        highest_bidder: address,
        highest_bid: u64,
        end_ts_ms: u64,
        // Funds and bidding mechanics will be added in a later iteration
    }

    public entry fun init(default_cooldown_ms: u64, ctx: &mut TxContext) {
        let reg = TickerRegistry { id: object::new(ctx), tickers: table::new<String, TickerInfo>(ctx), default_cooldown_ms };
        transfer::share_object(reg);
    }

    // Admin controls
    public entry fun start_auction(_admin: &AdminCap, _registry: &mut TickerRegistry, _ticker: String, _duration_ms: u64, _clock: &Clock, _ctx: &mut TxContext) {
        // Stub: create Auction object and share it (no bidding yet)
        // let now = clock::timestamp_ms(_clock);
        // let auction = Auction { id: object::new(_ctx), ticker_symbol: _ticker, highest_bidder: @0x0, highest_bid: 0, end_ts_ms: now + _duration_ms };
        // transfer::share_object(auction);
    }

    public entry fun withdraw_reservation(_admin: &AdminCap, registry: &mut TickerRegistry, ticker: String) {
        if (table::contains(&registry.tickers, &ticker)) {
            let mut info = table::borrow_mut(&mut registry.tickers, &ticker);
            match info.status {
                TickerStatus::Reserved => { info.status = TickerStatus::Available; },
                _ => {}
            }
        }
    }

    public entry fun ban_ticker(_admin: &AdminCap, registry: &mut TickerRegistry, ticker: String) {
        upsert_with_status(registry, ticker, TickerStatus::Banned)
    }

    public entry fun reserve_ticker(_admin: &AdminCap, registry: &mut TickerRegistry, ticker: String) {
        upsert_with_status(registry, ticker, TickerStatus::Reserved)
    }

    public entry fun whitelist_ticker(_admin: &AdminCap, registry: &mut TickerRegistry, ticker: String, user: address) {
        if (table::contains(&registry.tickers, &ticker)) {
            let mut info = table::borrow_mut(&mut registry.tickers, &ticker);
            vector::push_back(&mut info.whitelist, user);
            info.status = TickerStatus::Whitelisted;
        } else {
            let mut wl = vector::empty<address>();
            vector::push_back(&mut wl, user);
            let info = TickerInfo { status: TickerStatus::Whitelisted, token_id: opt::none<ID>(), cooldown_ends_ts_ms: 0, whitelist: wl };
            table::insert(&mut registry.tickers, ticker, info);
        }
    }

    public entry fun set_cooldown_period(_admin: &AdminCap, registry: &mut TickerRegistry, cooldown_ms: u64) { registry.default_cooldown_ms = cooldown_ms; }

    public fun mark_active_with_lock(registry: &mut TickerRegistry, ticker: String, token_id: ID, cooldown_ends_ts_ms: u64) {
        let info = TickerInfo { status: TickerStatus::Active, token_id: opt::some<ID>(token_id), cooldown_ends_ts_ms, whitelist: vector::empty<address>() };
        table::insert(&mut registry.tickers, ticker, info);
    }

    public fun contains(registry: &TickerRegistry, ticker: &String): bool { table::contains(&registry.tickers, ticker) }

    fun upsert_with_status(registry: &mut TickerRegistry, ticker: String, status: TickerStatus) {
        if (table::contains(&registry.tickers, &ticker)) {
            let mut info = table::borrow_mut(&mut registry.tickers, &ticker);
            info.status = status;
        } else {
            let info = TickerInfo { status, token_id: opt::none<ID>(), cooldown_ends_ts_ms: 0, whitelist: vector::empty<address>() };
            table::insert(&mut registry.tickers, ticker, info);
        }
    }

    // ensure_exists removed to avoid copying String keys

    // Auction winner claim path and status transitions will be implemented with full logic later.
}
