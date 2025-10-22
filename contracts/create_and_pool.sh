#!/bin/bash
set -e

echo "🚀 Creating fresh memecoin and auto-pooling with Cetus"
echo ""

# Create coin
TICKER="FINAL$(date +%s | tail -c 5)"
echo "📦 Creating coin: $TICKER"

cd /workspace
rm -rf final_test_coin
mkdir -p final_test_coin/sources

cat > final_test_coin/Move.toml <<EOF
[package]
name = "final_test_coin"
version = "1.0.0"
edition = "2024.beta"
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
[addresses]
final_test_coin = "0x0"
EOF

cat > final_test_coin/sources/coin.move <<'MOVE'
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
MOVE

echo "Publishing..."
PUBLISH_OUTPUT=$(sui client publish --gas-budget 100000000 final_test_coin 2>&1)

# Extract IDs
PKG_ID=$(echo "$PUBLISH_OUTPUT" | grep "PackageID:" | awk '{print $3}')
TREASURY_ID=$(echo "$PUBLISH_OUTPUT" | grep -A 5 "TreasuryCap" | grep "ObjectID:" | awk '{print $3}')
METADATA_ID=$(echo "$PUBLISH_OUTPUT" | grep -A 5 "CoinMetadata" | grep "ObjectID:" | awk '{print $3}')

echo "✅ Package: $PKG_ID"
echo "✅ Treasury: $TREASURY_ID"  
echo "✅ Metadata: $METADATA_ID"
echo ""

COIN_TYPE="${PKG_ID}::final_memefi::FINAL_MEMEFI"

echo "Creating bonding curve..."
sui client call \
  --package 0x89e30287cbfd4bb53ea258146cbdac50165478b39020067f1adce731c9f41853 \
  --module bonding_curve \
  --function create_new_meme_token \
  --type-args "$COIN_TYPE" \
  --args \
    0x0f19670242d0aef9b878715a017998d8f76aa222bb2f54e453728a750655da07 \
    0xe0cb6b5e4396ae9e8444d123f36d086cbb6e6b3b5c808cca968a942f5b475a32 \
    $TREASURY_ID \
    $METADATA_ID \
    0x6 \
  --gas-budget 100000000 > /tmp/curve_create.txt 2>&1

CURVE_ID=$(grep "ObjectID:" /tmp/curve_create.txt | grep "BondingCurve" -A 2 | grep "ObjectID:" | awk '{print $3}')

echo "✅ Curve: $CURVE_ID"
echo ""
echo "Now you can use TypeScript to complete the graduation + pool creation!"
echo ""
echo "Coin Type: $COIN_TYPE"
echo "Curve ID: $CURVE_ID"
echo "Metadata: $METADATA_ID"

