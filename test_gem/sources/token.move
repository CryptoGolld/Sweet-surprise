module test_gem::gem {
    use sui::coin;

    public struct GEM has drop {}

    fun init(witness: GEM, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"GEM",
            b"GemCoin",
            b"Test with fixed contract!",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
