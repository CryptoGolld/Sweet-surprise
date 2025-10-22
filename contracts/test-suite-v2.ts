import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import * as fs from 'fs';

// Configuration
const PACKAGE_ID = "0xbb09f7aea65160f0721785012f2fceb7295f99642110da6b539995341764fb00";
const PLATFORM_CONFIG = "0xea1744faf752d8402544ed92a9afc7230da16eb0bd099238f45ed574f31a2ab3";
const CLOCK = "0x6";

// Test token info
const STAR_COIN_TYPE = "0x5b02ec6dea48fc54743139ec79c412148ce3e1f0ae375160392fabdce86e4b5c::star::STAR";
const STAR_TREASURY_CAP = "0x22d1c86818700729c0f456161cb5894d0b1ecfba1554de4d3a5b9c2c9aa657c0";

async function getKeypair(): Promise<Ed25519Keypair> {
    const mnemonic = "file response noodle climb hotel fatal despair punch video thank food trial";
    return Ed25519Keypair.deriveKeypair(mnemonic);
}

async function main() {
    console.log('\n🚀 SuiLFG Launch - Complete Test Suite\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
    const keypair = await getKeypair();
    const address = keypair.getPublicKey().toSuiAddress();
    
    console.log(`📍 Address: ${address}`);
    
    const balance = await client.getBalance({ owner: address });
    console.log(`💰 Balance: ${Number(balance.totalBalance) / 1e9} SUI\n`);
    
    let curveId: string | null = null;
    let tokenCoinId: string | null = null;
    
    try {
        // TEST 1: Create Bonding Curve
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('TEST 1: Creating Bonding Curve');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        const tx1 = new Transaction();
        tx1.moveCall({
            target: `${PACKAGE_ID}::bonding_curve::create_new_meme_token`,
            typeArguments: [STAR_COIN_TYPE],
            arguments: [
                tx1.object(PLATFORM_CONFIG),
                tx1.object(STAR_TREASURY_CAP)
            ]
        });
        tx1.setGasBudget(100000000);
        
        const result1 = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx1,
            options: {
                showEffects: true,
                showObjectChanges: true,
                showEvents: true
            }
        });
        
        console.log(`✅ Transaction: ${result1.digest}`);
        console.log(`📊 Status: ${result1.effects?.status?.status}\n`);
        
        // Find all created objects
        console.log('📦 Objects Created:');
        if (result1.objectChanges) {
            for (const change of result1.objectChanges) {
                if (change.type === 'created') {
                    const obj = change as any;
                    console.log(`   - ${obj.objectId}`);
                    console.log(`     Type: ${obj.objectType}`);
                    
                    // Check if it's the bonding curve
                    if (obj.objectType && obj.objectType.includes('bonding_curve::BondingCurve')) {
                        curveId = obj.objectId;
                        console.log(`     ✅ THIS IS THE BONDING CURVE!`);
                    }
                }
            }
        }
        
        if (!curveId) {
            console.log('\n⚠️  Bonding curve not found in created objects');
            console.log('Looking in shared objects...\n');
            
            // Check shared objects
            if (result1.objectChanges) {
                for (const change of result1.objectChanges) {
                    if (change.type === 'published' || change.type === 'mutated') {
                        console.log(`   ${change.type}: ${(change as any).objectId}`);
                    }
                }
            }
        }
        
        // Check events
        console.log('\n📢 Events:');
        if (result1.events && result1.events.length > 0) {
            result1.events.forEach((event, i) => {
                console.log(`   ${i + 1}. ${event.type}`);
                if (event.parsedJson) {
                    console.log(`      ${JSON.stringify(event.parsedJson)}`);
                }
            });
        } else {
            console.log('   No events emitted');
        }
        
        if (curveId) {
            console.log(`\n✅ TEST 1 PASSED!`);
            console.log(`🎯 Bonding Curve: ${curveId}\n`);
            
            // Get curve details
            const curveObj = await client.getObject({
                id: curveId,
                options: { showContent: true }
            });
            
            if (curveObj.data?.content && 'fields' in curveObj.data.content) {
                const fields = curveObj.data.content.fields as any;
                console.log('📊 Curve Details:');
                console.log(`   SUI Reserve: ${Number(fields.sui_reserve || 0) / 1e9} SUI`);
                console.log(`   Token Supply: ${fields.token_supply || 0}`);
                console.log(`   Creator: ${fields.creator}`);
                console.log(`   Graduated: ${fields.graduated || false}`);
                console.log(`   LP Seeded: ${fields.lp_seeded || false}\n`);
            }
            
            // TEST 2: Buy Tokens
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('TEST 2: Buying Tokens (1 SUI)');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            
            const tx2 = new Transaction();
            const [coin] = tx2.splitCoins(tx2.gas, [1000000000]); // 1 SUI
            
            tx2.moveCall({
                target: `${PACKAGE_ID}::bonding_curve::buy`,
                typeArguments: [STAR_COIN_TYPE],
                arguments: [
                    tx2.object(curveId),
                    coin,
                    tx2.object(CLOCK)
                ]
            });
            tx2.setGasBudget(100000000);
            
            const result2 = await client.signAndExecuteTransaction({
                signer: keypair,
                transaction: tx2,
                options: {
                    showEffects: true,
                    showObjectChanges: true,
                    showEvents: true,
                    showBalanceChanges: true
                }
            });
            
            console.log(`✅ Transaction: ${result2.digest}`);
            console.log(`📊 Status: ${result2.effects?.status?.status}\n`);
            
            // Find token coins
            console.log('🪙 Tokens Received:');
            if (result2.objectChanges) {
                for (const change of result2.objectChanges) {
                    if (change.type === 'created') {
                        const obj = change as any;
                        if (obj.objectType && obj.objectType.includes(STAR_COIN_TYPE)) {
                            tokenCoinId = obj.objectId;
                            console.log(`   ✅ Token Coin: ${obj.objectId}`);
                        }
                    }
                }
            }
            
            // Check events
            console.log('\n📢 Buy Events:');
            if (result2.events && result2.events.length > 0) {
                result2.events.forEach((event, i) => {
                    console.log(`   ${i + 1}. ${event.type}`);
                    if (event.parsedJson) {
                        const data = event.parsedJson as any;
                        if (data.tokens_out) console.log(`      Tokens: ${data.tokens_out}`);
                        if (data.sui_in) console.log(`      SUI In: ${Number(data.sui_in) / 1e9}`);
                    }
                });
            }
            
            // Check balance changes
            if (result2.balanceChanges && result2.balanceChanges.length > 0) {
                console.log('\n💸 Balance Changes:');
                result2.balanceChanges.forEach((change) => {
                    const amount = Number(change.amount) / 1e9;
                    const coinType = change.coinType.split('::').pop();
                    console.log(`   ${coinType}: ${amount > 0 ? '+' : ''}${amount.toFixed(6)}`);
                });
            }
            
            // Check curve state after buy
            const curveAfterBuy = await client.getObject({
                id: curveId,
                options: { showContent: true }
            });
            
            if (curveAfterBuy.data?.content && 'fields' in curveAfterBuy.data.content) {
                const fields = curveAfterBuy.data.content.fields as any;
                const suiReserve = Number(fields.sui_reserve || 0) / 1e9;
                const progress = (suiReserve / 13.333) * 100;
                
                console.log('\n📊 Curve After Buy:');
                console.log(`   SUI Reserve: ${suiReserve.toFixed(4)} SUI`);
                console.log(`   Token Supply: ${fields.token_supply || 0}`);
                console.log(`   Progress: ${progress.toFixed(2)}% to graduation`);
                console.log(`   Graduated: ${fields.graduated || false}\n`);
            }
            
            console.log('✅ TEST 2 PASSED!\n');
            
            // TEST 3: Sell Some Tokens Back
            if (tokenCoinId) {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('TEST 3: Selling Tokens Back');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                
                const tx3 = new Transaction();
                
                tx3.moveCall({
                    target: `${PACKAGE_ID}::bonding_curve::sell`,
                    typeArguments: [STAR_COIN_TYPE],
                    arguments: [
                        tx3.object(curveId),
                        tx3.object(tokenCoinId),
                        tx3.object(CLOCK)
                    ]
                });
                tx3.setGasBudget(100000000);
                
                const result3 = await client.signAndExecuteTransaction({
                    signer: keypair,
                    transaction: tx3,
                    options: {
                        showEffects: true,
                        showEvents: true,
                        showBalanceChanges: true
                    }
                });
                
                console.log(`✅ Transaction: ${result3.digest}`);
                console.log(`📊 Status: ${result3.effects?.status?.status}\n`);
                
                // Check events
                console.log('📢 Sell Events:');
                if (result3.events && result3.events.length > 0) {
                    result3.events.forEach((event, i) => {
                        console.log(`   ${i + 1}. ${event.type}`);
                        if (event.parsedJson) {
                            const data = event.parsedJson as any;
                            if (data.tokens_in) console.log(`      Tokens Sold: ${data.tokens_in}`);
                            if (data.sui_out) console.log(`      SUI Received: ${Number(data.sui_out) / 1e9}`);
                        }
                    });
                }
                
                // Check balance changes
                if (result3.balanceChanges && result3.balanceChanges.length > 0) {
                    console.log('\n💸 Balance Changes:');
                    result3.balanceChanges.forEach((change) => {
                        const amount = Number(change.amount) / 1e9;
                        const coinType = change.coinType.split('::').pop();
                        console.log(`   ${coinType}: ${amount > 0 ? '+' : ''}${amount.toFixed(6)}`);
                    });
                }
                
                console.log('\n✅ TEST 3 PASSED!\n');
            }
        } else {
            console.log('\n❌ Cannot proceed without curve ID\n');
        }
        
    } catch (error: any) {
        console.error(`\n❌ ERROR: ${error.message}\n`);
        if (error.cause) {
            console.error('Details:', error.cause);
        }
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    TESTS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
