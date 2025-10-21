/// TEST - Testing the COMPLETE FIXED platform! 🧪
module test_memecoin::test_memefi {
    use sui::coin::{Self};
    use sui::url;

    public struct TEST_MEMEFI has drop {}

    fun init(witness: TEST_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"TEST008",
            b"Test MemeFi",
            b"The ultimate test! Buy 1500 SUILFG_MEMEFI and get MILLIONS of TEST! 🧪🚀",
            option::some(url::new_unsafe_from_bytes(b"https://raw.githubusercontent.com/suilfg/assets/main/diamond.png")),
            ctx
        );

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
