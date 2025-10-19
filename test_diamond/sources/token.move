module test_diamond::diamond {
    use sui::coin;

    public struct DIAMOND has drop {}

    fun init(witness: DIAMOND, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"DIAMOND",
            b"DiamondCoin",
            b"Test with 737M limit!",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
