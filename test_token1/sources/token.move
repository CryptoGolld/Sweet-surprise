module token1::token1 {
    use sui::coin;
    public struct TOKEN1 has drop {}
    fun init(witness: TOKEN1, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(witness, 0, b"DUPE", b"Token1", b"First token", option::none(), ctx);
        transfer::public_transfer(treasury, ctx.sender());
        transfer::public_freeze_object(metadata);
    }
}
