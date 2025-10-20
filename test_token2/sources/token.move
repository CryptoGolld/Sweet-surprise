module token2::token2 {
    use sui::coin;
    public struct TOKEN2 has drop {}
    fun init(witness: TOKEN2, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(witness, 0, b"DUPE", b"Token2", b"Second token - SAME TICKER!", option::none(), ctx);
        transfer::public_transfer(treasury, ctx.sender());
        transfer::public_freeze_object(metadata);
    }
}
