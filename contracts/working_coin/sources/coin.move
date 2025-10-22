module working_coin::working_memefi {
    use sui::coin::{Self};
    use sui::url;
    public struct WORKING_MEMEFI has drop {}
    fun init(witness: WORKING_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"WORK6198", b"Working Test",
            b"Actually making pool creation work",
            option::some(url::new_unsafe_from_bytes(b"https://work.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
