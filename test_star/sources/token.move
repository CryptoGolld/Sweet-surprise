module test_star::star {
    use sui::coin;

    public struct STAR has drop {}

    fun init(witness: STAR, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"STAR",
            b"StarCoin",
            b"Test buy/sell!",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
