module memecoin_demo::meme_coin {
    use sui::tx_context::{TxContext, sender};
    use sui::coin::{Self as coin, TreasuryCap};
    use sui::transfer;

    struct INIT has drop {}

    struct MEME has drop, store {}

    public(package) fun init(_: INIT, ctx: &mut TxContext) {
        let cap: TreasuryCap<MEME> = coin::init<MEME>(ctx);
        transfer::public_transfer(cap, sender(ctx));
    }
}
