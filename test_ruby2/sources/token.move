module ruby2::ruby2 {
    use sui::coin;
    public struct RUBY2 has drop {}
    fun init(witness: RUBY2, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(witness, 0, b"RUBY2", b"Ruby2", b"Test", option::none(), ctx);
        transfer::public_transfer(treasury, ctx.sender());
        transfer::public_freeze_object(metadata);
    }
}
