/// Faucet for SUILFG_MEMEFI - Allows 100 TEST_SUI claims every 6 hours
/// Admin can mint unlimited amounts at any time
/// Platform: SuiLFG MemeFi
module test_sui_faucet::faucet {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use test_sui_faucet::suilfg_memefi::SUILFG_MEMEFI;

    /// Error codes
    const EClaimTooSoon: u64 = 1;
    const EInsufficientBalance: u64 = 2;
    const ENotAdmin: u64 = 3;

    /// Constants
    const CLAIM_AMOUNT: u64 = 100_000_000_000; // 100 TEST_SUI (9 decimals)
    const CLAIM_INTERVAL_MS: u64 = 21_600_000; // 6 hours in milliseconds

    /// Admin capability
    public struct AdminCap has key, store {
        id: UID
    }

    /// Faucet shared object
    public struct Faucet has key {
        id: UID,
        /// Treasury cap for minting
        treasury_cap: TreasuryCap<SUILFG_MEMEFI>,
        /// Pre-minted balance for regular claims
        balance: Balance<SUILFG_MEMEFI>,
        /// Track last claim time per address
        last_claim: Table<address, u64>,
        /// Admin address
        admin: address,
    }

    /// Initialize the faucet
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        
        transfer::public_transfer(admin_cap, tx_context::sender(ctx));
    }

    /// Create and share the faucet (called after getting treasury cap)
    public fun create_faucet(
        treasury_cap: TreasuryCap<SUILFG_MEMEFI>,
        ctx: &mut TxContext
    ) {
        let faucet = Faucet {
            id: object::new(ctx),
            treasury_cap,
            balance: balance::zero(),
            last_claim: table::new(ctx),
            admin: tx_context::sender(ctx),
        };
        
        transfer::share_object(faucet);
    }

    /// Regular claim - 100 TEST_SUI every 6 hours (entry function)
    public entry fun claim(
        faucet: &mut Faucet,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let coin = claim_internal(faucet, clock, ctx);
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    /// Internal claim function that returns the coin
    fun claim_internal(
        faucet: &mut Faucet,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<SUILFG_MEMEFI> {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Check if user can claim
        if (table::contains(&faucet.last_claim, sender)) {
            let last_claim_time = *table::borrow(&faucet.last_claim, sender);
            assert!(
                current_time >= last_claim_time + CLAIM_INTERVAL_MS,
                EClaimTooSoon
            );
        };

        // Mint new coins if balance is insufficient
        if (balance::value(&faucet.balance) < CLAIM_AMOUNT) {
            let new_coins = coin::mint(&mut faucet.treasury_cap, CLAIM_AMOUNT * 1000, ctx);
            balance::join(&mut faucet.balance, coin::into_balance(new_coins));
        };

        // Update last claim time
        if (table::contains(&faucet.last_claim, sender)) {
            *table::borrow_mut(&mut faucet.last_claim, sender) = current_time;
        } else {
            table::add(&mut faucet.last_claim, sender, current_time);
        };

        // Take coins from balance
        let coin_balance = balance::split(&mut faucet.balance, CLAIM_AMOUNT);
        coin::from_balance(coin_balance, ctx)
    }

    /// Admin mint - unlimited amount, any time (entry function)
    public entry fun admin_mint(
        faucet: &mut Faucet,
        _admin_cap: &AdminCap,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(&mut faucet.treasury_cap, amount, ctx);
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    /// Admin refill - add coins to faucet balance
    public fun admin_refill(
        faucet: &mut Faucet,
        _admin_cap: &AdminCap,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let new_coins = coin::mint(&mut faucet.treasury_cap, amount, ctx);
        balance::join(&mut faucet.balance, coin::into_balance(new_coins));
    }

    /// Check remaining time until next claim (in milliseconds)
    public fun time_until_next_claim(
        faucet: &Faucet,
        user: address,
        clock: &Clock
    ): u64 {
        if (!table::contains(&faucet.last_claim, user)) {
            return 0
        };

        let last_claim_time = *table::borrow(&faucet.last_claim, user);
        let current_time = clock::timestamp_ms(clock);
        let next_claim_time = last_claim_time + CLAIM_INTERVAL_MS;

        if (current_time >= next_claim_time) {
            0
        } else {
            next_claim_time - current_time
        }
    }

    /// Get faucet balance
    public fun get_balance(faucet: &Faucet): u64 {
        balance::value(&faucet.balance)
    }

    /// Get claim amount constant
    public fun get_claim_amount(): u64 {
        CLAIM_AMOUNT
    }

    /// Get claim interval constant
    public fun get_claim_interval(): u64 {
        CLAIM_INTERVAL_MS
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
