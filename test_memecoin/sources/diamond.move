/// DIAMOND - Testing the COMPLETE FIXED platform! 💎
module test_memecoin::diamond_memefi {
    use sui::coin::{Self};
    use sui::url;

    public struct DIAMOND_MEMEFI has drop {}

    fun init(witness: DIAMOND_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"DIAMOND",
            b"Diamond MemeFi",
            b"The ultimate test! Buy 1000 SUILFG_MEMEFI and get MILLIONS of DIAMOND! 💎🚀",
            option::some(url::new_unsafe_from_bytes(b"https://raw.githubusercontent.com/suilfg/assets/main/diamond.png")),
            ctx
        );

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
