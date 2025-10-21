/// STARS MemeFi - Testing the COMPLETE FIX! ⭐
module stars_memefi::stars_memefi {
    use sui::coin::{Self};
    use sui::url;

    public struct STARS_MEMEFI has drop {}

    fun init(witness: STARS_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"STARS",
            b"Stars MemeFi",
            b"Testing the FIXED platform! Buy 1000 SUILFG and get MILLIONS of STARS! ⭐🚀",
            option::some(url::new_unsafe_from_bytes(b"https://raw.githubusercontent.com/suilfg/assets/main/stars.png")),
            ctx
        );

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
