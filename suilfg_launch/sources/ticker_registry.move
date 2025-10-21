module suilfg_launch::ticker_registry {
    use sui::object::{UID, ID};
    use sui::object;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::table::{Table};
    use sui::table as table;
    use std::string::String;
    use std::string;
    use std::option::{Self as opt, Option};
    use sui::clock::Clock;
    use std::vector;

    use suilfg_launch::platform_config::AdminCap;

    public enum TickerStatus has copy, drop, store { Available, Active, OnCooldown, Banned, Reserved, Whitelisted }

    public struct TickerInfo has store, drop {
        status: TickerStatus,
        token_id: Option<ID>,
        cooldown_ends_ts_ms: u64,
        whitelist: vector<address>,
        // Ticker economy fields
        first_use_ts_ms: u64,          // When ticker was FIRST used (never resets)
        last_use_ts_ms: u64,           // When ticker was LAST used (resets every reuse!)
        graduated_ts_ms: u64,          // When LATEST token graduated (0 if not graduated)
        current_reuse_fee_mist: u64,   // Current fee to bypass cooldown
        reserved_for: Option<address>, // Who ticker is reserved for (if Reserved status)
        // History tracking
        reuse_count: u64,              // How many times ticker has been reused
        total_tokens_launched: u64,    // Total number of tokens launched with this ticker
    }

    public struct TickerRegistry has key, store {
        id: UID,
        tickers: Table<String, TickerInfo>,
        default_cooldown_ms: u64,
    }

    public struct Auction has key, store {
        id: UID,
        ticker_symbol: String,
        highest_bidder: address,
        highest_bid: u64,
        end_ts_ms: u64,
        // Funds and bidding mechanics will be added in a later iteration
    }

    fun init(_witness: TICKER_REGISTRY, ctx: &mut TxContext) {
        let default_cooldown_ms: u64 = 30 * 24 * 60 * 60 * 1000; // 30 days default
        let reg = TickerRegistry { id: object::new(ctx), tickers: table::new<String, TickerInfo>(ctx), default_cooldown_ms };
        transfer::share_object(reg);
    }

    public struct TICKER_REGISTRY has drop {}

    fun clone_string(s: &String): String {
        let bytes_ref = string::as_bytes(s);
        let len = vector::length<u8>(bytes_ref);
        let mut out = vector::empty<u8>();
        let mut i: u64 = 0;
        while (i < len) {
            let b = *vector::borrow<u8>(bytes_ref, i);
            vector::push_back(&mut out, b);
            i = i + 1;
        };
        string::utf8(out)
    }

    // Admin controls
    public fun start_auction(_admin: &AdminCap, _registry: &mut TickerRegistry, _ticker: String, _duration_ms: u64, _clock: &Clock, _ctx: &mut TxContext) {
        // Stub: create Auction object and share it (no bidding yet)
        // let now = clock::timestamp_ms(_clock);
        // let auction = Auction { id: object::new(_ctx), ticker_symbol: _ticker, highest_bidder: @0x0, highest_bid: 0, end_ts_ms: now + _duration_ms };
        // transfer::share_object(auction);
    }

    public fun withdraw_reservation(_admin: &AdminCap, registry: &mut TickerRegistry, ticker: String) {
        let key_for_contains = clone_string(&ticker);
        if (table::contains<String, TickerInfo>(&registry.tickers, key_for_contains)) {
            let key_for_borrow = clone_string(&ticker);
            let info_ref = table::borrow_mut<String, TickerInfo>(&mut registry.tickers, key_for_borrow);
            if (info_ref.status == TickerStatus::Reserved) { info_ref.status = TickerStatus::Available; }
        }
    }

    public fun ban_ticker(_admin: &AdminCap, registry: &mut TickerRegistry, ticker: String) {
        upsert_with_status(registry, ticker, TickerStatus::Banned)
    }

    public fun reserve_ticker(_admin: &AdminCap, registry: &mut TickerRegistry, ticker: String) {
        upsert_with_status(registry, ticker, TickerStatus::Reserved)
    }

    public fun reserve_ticker_for(_admin: &AdminCap, registry: &mut TickerRegistry, ticker: String, reserved_for: address) {
        let key_for_contains = clone_string(&ticker);
        if (table::contains<String, TickerInfo>(&registry.tickers, key_for_contains)) {
            let key_for_borrow = clone_string(&ticker);
            let info_ref = table::borrow_mut<String, TickerInfo>(&mut registry.tickers, key_for_borrow);
            info_ref.status = TickerStatus::Reserved;
            info_ref.reserved_for = opt::some<address>(reserved_for);
        } else {
            let info = TickerInfo { 
                status: TickerStatus::Reserved, 
                token_id: opt::none<ID>(), 
                cooldown_ends_ts_ms: 0, 
                whitelist: vector::empty<address>(),
                first_use_ts_ms: 0,
                last_use_ts_ms: 0,
                graduated_ts_ms: 0,
                current_reuse_fee_mist: 0,
                reserved_for: opt::some<address>(reserved_for),
                reuse_count: 0,
                total_tokens_launched: 0,
            };
            table::add<String, TickerInfo>(&mut registry.tickers, ticker, info);
        }
    }

    public fun whitelist_ticker(_admin: &AdminCap, registry: &mut TickerRegistry, ticker: String, user: address) {
        let key_for_contains = clone_string(&ticker);
        if (table::contains<String, TickerInfo>(&registry.tickers, key_for_contains)) {
            let key_for_borrow = clone_string(&ticker);
            let info_ref = table::borrow_mut<String, TickerInfo>(&mut registry.tickers, key_for_borrow);
            vector::push_back(&mut info_ref.whitelist, user);
            info_ref.status = TickerStatus::Whitelisted;
        } else {
            let mut wl = vector::empty<address>();
            vector::push_back(&mut wl, user);
            let info = TickerInfo { status: TickerStatus::Whitelisted, token_id: opt::none<ID>(), cooldown_ends_ts_ms: 0, whitelist: wl, first_use_ts_ms: 0, last_use_ts_ms: 0, graduated_ts_ms: 0, current_reuse_fee_mist: 0, reserved_for: opt::none<address>(), reuse_count: 0, total_tokens_launched: 0 };
            table::add<String, TickerInfo>(&mut registry.tickers, ticker, info);
        }
    }

    public fun set_cooldown_period(_admin: &AdminCap, registry: &mut TickerRegistry, cooldown_ms: u64) { registry.default_cooldown_ms = cooldown_ms; }

    public fun mark_active_with_lock(registry: &mut TickerRegistry, ticker: String, token_id: ID, last_use_ts_ms: u64, cooldown_ends_ts_ms: u64) {
        let info = TickerInfo { 
            status: TickerStatus::Active, 
            token_id: opt::some<ID>(token_id), 
            cooldown_ends_ts_ms, 
            whitelist: vector::empty<address>(),
            first_use_ts_ms: last_use_ts_ms,  // First time using this ticker
            last_use_ts_ms,  // Timer resets every time ticker is reused!
            graduated_ts_ms: 0,
            current_reuse_fee_mist: 0,
            reserved_for: opt::none<address>(),
            reuse_count: 0,  // First use, no reuse yet
            total_tokens_launched: 1,  // First token
        };
        table::add<String, TickerInfo>(&mut registry.tickers, ticker, info);
    }

    // Update existing ticker for reuse (preserves history)
    public fun update_ticker_for_reuse(registry: &mut TickerRegistry, ticker: String, new_token_id: ID, now_ts_ms: u64, cooldown_ends_ts_ms: u64) {
        let key = clone_string(&ticker);
        if (!table::contains<String, TickerInfo>(&registry.tickers, key)) {
            return  // Ticker doesn't exist, can't update
        };
        
        let info = table::borrow_mut<String, TickerInfo>(&mut registry.tickers, ticker);
        
        // Update for new token (preserve history)
        info.status = TickerStatus::Active;
        info.token_id = opt::some<ID>(new_token_id);
        info.last_use_ts_ms = now_ts_ms;  // Reset timer
        info.cooldown_ends_ts_ms = cooldown_ends_ts_ms;
        info.current_reuse_fee_mist = 0;  // Reset fee
        info.graduated_ts_ms = 0;  // New token hasn't graduated yet
        
        // Increment history counters (THIS IS THE KEY!)
        info.reuse_count = info.reuse_count + 1;
        info.total_tokens_launched = info.total_tokens_launched + 1;
        
        // Note: first_use_ts_ms is NOT reset - preserves original date!
    }

    public fun contains(registry: &TickerRegistry, ticker: String): bool { table::contains<String, TickerInfo>(&registry.tickers, ticker) }

    // Remove ticker entry (for reuse)
    public fun remove_ticker(registry: &mut TickerRegistry, ticker: String) {
        let key = clone_string(&ticker);
        if (table::contains<String, TickerInfo>(&registry.tickers, key)) {
            let _removed = table::remove<String, TickerInfo>(&mut registry.tickers, ticker);
            // TickerInfo has 'drop' ability, so it's automatically dropped
        }
    }

    // Mark token as graduated and set up cooldown with fee
    public fun mark_graduated(registry: &mut TickerRegistry, ticker: String, graduated_ts_ms: u64, base_fee_mist: u64) {
        let key = clone_string(&ticker);
        if (table::contains<String, TickerInfo>(&registry.tickers, key)) {
            let info = table::borrow_mut<String, TickerInfo>(&mut registry.tickers, ticker);
            info.graduated_ts_ms = graduated_ts_ms;
            info.current_reuse_fee_mist = base_fee_mist;
            info.status = TickerStatus::OnCooldown;
        }
    }

    // Check if ticker can be claimed (lazy revocation check)
    public fun is_ticker_claimable(registry: &TickerRegistry, ticker: String, max_lock_ms: u64, clock: &Clock): bool {
        use sui::clock;
        let key = clone_string(&ticker);
        if (!table::contains<String, TickerInfo>(&registry.tickers, key)) {
            return true // Available
        };
        
        let info = table::borrow<String, TickerInfo>(&registry.tickers, ticker);
        let now = clock::timestamp_ms(clock);
        
        // Check if max lock period exceeded (from LAST use, not first!)
        if (info.last_use_ts_ms > 0) {
            let elapsed = now - info.last_use_ts_ms;
            if (elapsed >= max_lock_ms) {
                return true // 7 days since LAST use exceeded
            }
        };
        
        // Check if graduated and cooldown expired
        if (info.graduated_ts_ms > 0 && now >= info.cooldown_ends_ts_ms) {
            return true // Cooldown expired
        };
        
        false
    }

    // Get current reuse fee for ticker
    public fun get_current_reuse_fee(registry: &TickerRegistry, ticker: String): u64 {
        let key = clone_string(&ticker);
        if (!table::contains<String, TickerInfo>(&registry.tickers, key)) {
            return 0 // Free
        };
        let info = table::borrow<String, TickerInfo>(&registry.tickers, ticker);
        info.current_reuse_fee_mist
    }

    // Admin force unlock
    public fun force_unlock_ticker(_admin: &AdminCap, registry: &mut TickerRegistry, ticker: String) {
        let key = clone_string(&ticker);
        if (table::contains<String, TickerInfo>(&registry.tickers, key)) {
            let info = table::borrow_mut<String, TickerInfo>(&mut registry.tickers, ticker);
            info.status = TickerStatus::Available;
            info.current_reuse_fee_mist = 0;
            info.graduated_ts_ms = 0;
        }
    }

    fun upsert_with_status(registry: &mut TickerRegistry, ticker: String, status: TickerStatus) {
        let key_for_contains = clone_string(&ticker);
        if (table::contains<String, TickerInfo>(&registry.tickers, key_for_contains)) {
            let key_for_borrow = clone_string(&ticker);
            let info_ref = table::borrow_mut<String, TickerInfo>(&mut registry.tickers, key_for_borrow);
            info_ref.status = status;
        } else {
            let info = TickerInfo { status, token_id: opt::none<ID>(), cooldown_ends_ts_ms: 0, whitelist: vector::empty<address>(), first_use_ts_ms: 0, last_use_ts_ms: 0, graduated_ts_ms: 0, current_reuse_fee_mist: 0, reserved_for: opt::none<address>(), reuse_count: 0, total_tokens_launched: 0 };
            table::add<String, TickerInfo>(&mut registry.tickers, ticker, info);
        }
    }

    // ensure_exists removed to avoid copying String keys

    // Auction winner claim path and status transitions will be implemented with full logic later.
}
