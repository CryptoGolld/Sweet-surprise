/// PEPE - The Dankest Memecoin on Sui
/// Launched on SuiLFG MemeFi Platform
/// 
/// Coin Type: 0x...::pepe_memefi::PEPE_MEMEFI
module pepe_memecoin::pepe_memefi {
    use sui::coin::{Self, TreasuryCap};
    use sui::url;

    /// ONE-TIME WITNESS
    /// MUST be uppercase of module name: pepe_memefi -> PEPE_MEMEFI
    public struct PEPE_MEMEFI has drop {}

    /// Initialize the PEPE_MEMEFI coin
    /// Called automatically when the package is published
    fun init(witness: PEPE_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,  // 6 decimals (1 PEPE = 1,000,000 base units)
            b"PEPE",  // Symbol shown in wallets
            b"Pepe Coin",  // Full name
            b"The rarest Pepe on Sui blockchain. Feel good, buy PEPE! Launched on SuiLFG MemeFi Platform with bonding curve mechanics and automatic Cetus graduation.",
            option::some(url::new_unsafe_from_bytes(b"https://i.imgur.com/dankpepe.png")),
            ctx
        );

        // Freeze the metadata so it can't be changed
        transfer::public_freeze_object(metadata);
        
        // Transfer treasury cap to deployer
        // This will be used by the bonding curve contract
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(PEPE_MEMEFI {}, ctx);
    }
}
