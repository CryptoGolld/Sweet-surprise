module final_test_coin::final_memefi {
    use sui::coin::{Self};
    use sui::url;
    public struct FINAL_MEMEFI has drop {}
    fun init(witness: FINAL_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"FINAL", b"Final Test",
            b"Final test of automatic Cetus pool creation",
            option::some(url::new_unsafe_from_bytes(b"https://final.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
