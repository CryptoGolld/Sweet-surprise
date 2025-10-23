module test_simple_coin::testcoin {
    use sui::coin;
    use sui::url;
    public struct TESTCOIN has drop {}
    fun init(witness: TESTCOIN, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"TESTSUI", b"Test Sui Coin",
            b"Simple test coin v1.0.0",
            option::some(url::new_unsafe_from_bytes(b"https://test.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
