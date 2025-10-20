module diamond2::diamond2 {
    use sui::coin;

    public struct DIAMOND2 has drop {}

    fun init(witness: DIAMOND2, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            6,  // 6 decimals instead of 9 - better for meme token display!
            b"DIAMOND2",
            b"Diamond Token 2",
            b"Test meme token with proper decimals",
            option::none(),
            ctx
        );
        transfer::public_transfer(treasury, ctx.sender());
        transfer::public_freeze_object(metadata);
    }
}
