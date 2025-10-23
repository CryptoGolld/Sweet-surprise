module test_auto_pool::test_memefi {
    use sui::coin::{Self};
    use sui::url;
    public struct TEST_MEMEFI has drop {}
    fun init(witness: TEST_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"TEST948141", b"Auto Pool Test",
            b"Testing automatic Cetus pool creation",
            option::some(url::new_unsafe_from_bytes(b"https://test.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
