module test_complete::moon {
    use sui::coin;

    public struct MOON has drop {}

    fun init(witness: MOON, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"MOON",
            b"MoonCoin",
            b"Test complete flow!",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
