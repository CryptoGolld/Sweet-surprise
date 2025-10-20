module emerald2::emerald2 {
    use sui::coin;

    public struct EMERALD2 has drop {}

    fun init(witness: EMERALD2, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            0,  // 0 DECIMALS - Perfect for meme tokens! 1,357,921 base units = 1,357,921 tokens displayed!
            b"EMERALD2",
            b"Emerald Token 2",
            b"Meme token with perfect display (no decimals)",
            option::none(),
            ctx
        );
        transfer::public_transfer(treasury, ctx.sender());
        transfer::public_freeze_object(metadata);
    }
}
