module test_coin::rocket {
    use sui::coin::{Self, TreasuryCap};
    use sui::tx_context::{Self, TxContext};
    use std::option;

    /// One-time witness type
    public struct ROCKET has drop {}

    /// Initialize the coin
    fun init(witness: ROCKET, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9, // decimals
            b"ROCK",
            b"TestRocket",
            b"Test token for SuiLFG testing",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
