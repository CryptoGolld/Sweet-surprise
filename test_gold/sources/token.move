module test_gold::gold {
    use sui::coin;

    public struct GOLD has drop {}

    fun init(witness: GOLD, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"GOLD",
            b"GoldCoin",
            b"Test with virtual supply fix!",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
