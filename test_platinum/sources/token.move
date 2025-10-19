module test_platinum::platinum {
    use sui::coin;

    public struct PLATINUM has drop {}

    fun init(witness: PLATINUM, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"PLAT",
            b"Platinum",
            b"Testing Cetus with correct tokenomics!",
            option::none(),
            ctx
        );
        
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}
