module test_emerald::emerald {
    use sui::coin;

    public struct EMERALD has drop {}

    fun init(witness: EMERALD, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"EMLD",
            b"Emerald",
            b"Comprehensive bonding curve test!",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
