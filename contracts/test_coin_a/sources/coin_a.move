/// Test Coin A for Cetus Pool Testing
module test_coin_a::coin_a {
    use sui::coin::{Self, TreasuryCap};
    use sui::url;

    /// One-time witness
    public struct COIN_A has drop {}

    /// Initialize function - called automatically on publish
    fun init(witness: COIN_A, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,  // decimals
            b"TESTA",  // Symbol
            b"Test Coin A",  // Name
            b"Test Coin A for Cetus pool testing on Sui Testnet",  // Description
            option::some(url::new_unsafe_from_bytes(b"https://example.com/coin-a.png")),  // Icon URL
            ctx
        );

        // Freeze the metadata
        transfer::public_freeze_object(metadata);
        
        // Transfer treasury to the sender
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    /// Public mint function for testing
    public entry fun mint(
        treasury_cap: &mut TreasuryCap<COIN_A>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }
}
