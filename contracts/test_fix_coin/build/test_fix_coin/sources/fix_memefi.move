module test_fix_coin::fix_memefi {
    use sui::coin::{Self};
    use sui::url;
    public struct FIX_MEMEFI has drop {}
    fun init(witness: FIX_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"FIX719950", b"Fix Test",
            b"Testing supply cap fix - should stop at 737M!",
            option::some(url::new_unsafe_from_bytes(b"https://fix.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
