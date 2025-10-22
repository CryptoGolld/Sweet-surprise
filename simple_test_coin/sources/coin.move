module simple_test_coin::pooltest {
    use sui::coin::{Self};
    use sui::url;
    public struct POOLTEST has drop {}
    fun init(witness: POOLTEST, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"POOL6674", b"Pool Test", b"Test",
            option::some(url::new_unsafe_from_bytes(b"https://test.png")), ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
