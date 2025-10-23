module test_graduation::graduation_test {
    use sui::coin;
    use sui::url;
    
    public struct GRADUATION_TEST has drop {}
    
    fun init(witness: GRADUATION_TEST, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            9,
            b"GRADTEST",
            b"Graduation Test",
            b"Testing v1.0.0 graduation with SUILFG_MEMEFI",
            option::some(url::new_unsafe_from_bytes(b"https://example.com/test.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }
}
