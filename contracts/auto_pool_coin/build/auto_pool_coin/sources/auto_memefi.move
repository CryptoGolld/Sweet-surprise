module auto_pool_coin::auto_memefi {
    use sui::coin::{Self};
    use sui::url;
    public struct AUTO_MEMEFI has drop {}
    fun init(witness: AUTO_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 9, b"AUTO7520", b"Auto Pool Test",
            b"Testing automatic Cetus pool creation with verified Pools address",
            option::some(url::new_unsafe_from_bytes(b"https://auto.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
