module test_coin_v142::gem {
    use sui::coin;

    public struct GEM has drop {}

    fun init(witness: GEM, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"GEM",
            b"GemToken",
            b"Test token v1.42.2",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
