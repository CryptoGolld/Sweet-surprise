/// MOON MemeFi - To the moon! 🌙
module moon_memefi::moon_memefi {
    use sui::coin::{Self};
    use sui::url;

    public struct MOON_MEMEFI has drop {}

    fun init(witness: MOON_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"MOON",
            b"Moon MemeFi",
            b"To the moon! Testing the FIXED bonding curve with proper token scaling. Millions of tokens await!",
            option::some(url::new_unsafe_from_bytes(b"https://raw.githubusercontent.com/suilfg/assets/main/moon.png")),
            ctx
        );

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
