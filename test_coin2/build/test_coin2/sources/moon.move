module test_coin2::moon {
    use sui::coin;

    public struct MOON has drop {}

    fun init(witness: MOON, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"MOON",
            b"MoonToken",
            b"Test token 2 for SuiLFG",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
