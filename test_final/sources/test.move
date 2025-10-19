module test_final::fire {
    use sui::coin;

    public struct FIRE has drop {}

    fun init(witness: FIRE, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"FIRE",
            b"FireToken",
            b"Test token for fixed bonding curve",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
