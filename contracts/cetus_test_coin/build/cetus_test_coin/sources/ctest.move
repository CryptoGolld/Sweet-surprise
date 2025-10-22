module cetus_test_coin::ctest {
    use sui::coin::{Self};
    public struct CTEST has drop {}
    fun init(witness: CTEST, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness, 9, b"CTEST0341", b"Cetus Test", b"Test",
            option::none(), ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }
}
