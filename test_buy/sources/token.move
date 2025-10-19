module test_buy::rocket {
    use sui::coin;

    public struct ROCKET has drop {}

    fun init(witness: ROCKET, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"ROCKET",
            b"RocketCoin",
            b"To the moon!",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
