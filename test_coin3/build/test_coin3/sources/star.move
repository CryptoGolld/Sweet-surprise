module test_coin3::star {
    use sui::coin;

    public struct STAR has drop {}

    fun init(witness: STAR, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"STAR",
            b"StarToken",
            b"Fresh test token for v1.58.2",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
