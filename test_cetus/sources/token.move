module test_cetus::whale {
    use sui::coin;

    public struct WHALE has drop {}

    fun init(witness: WHALE, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"WHALE",
            b"WhaleToken",
            b"Test for Cetus",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
