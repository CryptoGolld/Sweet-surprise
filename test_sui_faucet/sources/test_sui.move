/// TestSUI - A test token that mimics SUI for testnet with generous faucet
/// Platform: SuiLFG MemeFi
module test_sui_faucet::test_sui {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::url;

    /// One-time witness for the coin
    public struct TEST_SUI has drop {}

    /// Initialize the TEST_SUI coin
    fun init(witness: TEST_SUI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency<TEST_SUI>(
            witness,
            9, // Same decimals as SUI
            b"TEST_SUI",
            b"Test SUI",
            b"Test SUI token for SuiLFG MemeFi testnet - mimics real SUI with generous faucet (100 TEST_SUI every 6 hours)",
            option::some(url::new_unsafe_from_bytes(b"https://suilfg.com/test-sui-logo.png")),
            ctx
        );

        // Freeze metadata so it can't be changed
        transfer::public_freeze_object(metadata);
        
        // Transfer treasury cap to sender for use in faucet
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    /// Mint new TEST_SUI coins (used by faucet)
    public fun mint(
        treasury_cap: &mut TreasuryCap<TEST_SUI>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<TEST_SUI> {
        coin::mint(treasury_cap, amount, ctx)
    }

    /// Burn TEST_SUI coins
    public fun burn(
        treasury_cap: &mut TreasuryCap<TEST_SUI>,
        coin: Coin<TEST_SUI>
    ) {
        coin::burn(treasury_cap, coin);
    }
}
