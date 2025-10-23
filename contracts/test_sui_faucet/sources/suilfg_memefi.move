/// TestSUI - A test token that mimics SUI for testnet with generous faucet
/// Platform: SuiLFG MemeFi
/// Coin Type will be: ::suilfg_memefi::SUILFG_MEMEFI ✨
module test_sui_faucet::suilfg_memefi {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::url;

    /// One-time witness for the coin
    /// MUST be uppercase of module name (suilfg_memefi -> SUILFG_MEMEFI)
    public struct SUILFG_MEMEFI has drop {}

    /// Initialize the SUILFG_MEMEFI coin
    fun init(witness: SUILFG_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency<SUILFG_MEMEFI>(
            witness,
            9, // Same decimals as SUI
            b"SUI_MEMEFI",
            b"SuiLFG MemeFi Test SUI",
            b"Test SUI token for SuiLFG MemeFi testnet - mimics real SUI with generous faucet (100 TEST_SUI every 6 hours). Launched on SuiLFG MemeFi Platform.",
            option::some(url::new_unsafe_from_bytes(b"https://suilfg.com/test-sui-logo.png")),
            ctx
        );

        // Freeze metadata so it can't be changed
        transfer::public_freeze_object(metadata);
        
        // Transfer treasury cap to sender for use in faucet
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    /// Mint new SUILFG_MEMEFI coins (used by faucet)
    public fun mint(
        treasury_cap: &mut TreasuryCap<SUILFG_MEMEFI>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUILFG_MEMEFI> {
        coin::mint(treasury_cap, amount, ctx)
    }

    /// Burn SUILFG_MEMEFI coins
    public fun burn(
        treasury_cap: &mut TreasuryCap<SUILFG_MEMEFI>,
        coin: Coin<SUILFG_MEMEFI>
    ) {
        coin::burn(treasury_cap, coin);
    }
}
