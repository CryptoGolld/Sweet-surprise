/// ROCKET MemeFi - The first community memecoin launched on SuiLFG MemeFi Platform!
/// 🚀 To the moon and beyond! 🚀

module rocket_memefi::rocket_memefi {
    use sui::coin::{Self, TreasuryCap};
    use sui::url;

    /// ONE-TIME WITNESS
    /// MUST be uppercase of module name (rocket_memefi -> ROCKET_MEMEFI)
    public struct ROCKET_MEMEFI has drop {}

    /// Initialize function - called automatically on publish
    fun init(witness: ROCKET_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,  // decimals - same as SUI
            b"ROCKET",  // Symbol
            b"Rocket MemeFi",  // Name
            b"The first community memecoin on SuiLFG MemeFi Platform. To the moon! Launched with 1B supply on bonding curve.",
            option::some(url::new_unsafe_from_bytes(b"https://raw.githubusercontent.com/suilfg/assets/main/rocket.png")),
            ctx
        );

        // Freeze the metadata so it can't be changed
        transfer::public_freeze_object(metadata);
        
        // Transfer treasury cap to the creator (will be used to create bonding curve)
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
