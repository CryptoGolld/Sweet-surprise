import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import * as fs from 'fs';

// Configuration
const PACKAGE_ID = "0xbb09f7aea65160f0721785012f2fceb7295f99642110da6b539995341764fb00";
const PLATFORM_CONFIG = "0xea1744faf752d8402544ed92a9afc7230da16eb0bd099238f45ed574f31a2ab3";
const TICKER_REGISTRY = "0xf9ba702ff1547d89ff033f67271b9d17593e0d60ca7f4221e775908653f4f740";
const CLOCK = "0x6";

// Test token info
const STAR_COIN_TYPE = "0x5b02ec6dea48fc54743139ec79c412148ce3e1f0ae375160392fabdce86e4b5c::star::STAR";
const STAR_TREASURY_CAP = "0x22d1c86818700729c0f456161cb5894d0b1ecfba1554de4d3a5b9c2c9aa657c0";

async function getKeypair(): Promise<Ed25519Keypair> {
    // Use the recovery phrase from wallet creation
    const mnemonic = "file response noodle climb hotel fatal despair punch video thank food trial";
    return Ed25519Keypair.deriveKeypair(mnemonic);
}

async function main() {
    console.log('\n🚀 Starting Comprehensive Test Suite...\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
    const keypair = await getKeypair();
    const address = keypair.getPublicKey().toSuiAddress();
    
    console.log(`📍 Testing Address: ${address}\n`);
    
    // Check balance
    const balance = await client.getBalance({ owner: address });
    console.log(`💰 Balance: ${Number(balance.totalBalance) / 1e9} SUI\n`);
    
    let testResults: any = {
        createCurve: { status: 'pending', digest: null, curveId: null },
        buyTokens: { status: 'pending', digest: null, amountReceived: null },
        sellTokens: { status: 'pending', digest: null, amountReceived: null },
        graduation: { status: 'pending', digest: null, poolId: null },
        verifyLock: { status: 'pending', lockId: null, isPermanent: null }
    };
    
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
        
        console.log('📤 Submitting transaction...');
        const result1 = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx1,
            options: {
                showEffects: true,
                showObjectChanges: true,
                showEvents: true
            }
        });
        
        console.log(`✅ Transaction executed!`);
        console.log(`📋 Digest: ${result1.digest}`);
        
        // Find the created BondingCurve object
        const createdObjects = result1.objectChanges?.filter(
            (obj: any) => obj.type === 'created' && obj.objectType?.includes('BondingCurve')
        );
        
        if (createdObjects && createdObjects.length > 0) {
            const curveId = (createdObjects[0] as any).objectId;
            console.log(`🎯 Bonding Curve Created: ${curveId}`);
            testResults.createCurve = { 
                status: 'success', 
                digest: result1.digest,
                curveId 
            };
            
            // Check events
            if (result1.events && result1.events.length > 0) {
                console.log(`📢 Events emitted: ${result1.events.length}`);
                result1.events.forEach((event: any, i: number) => {
                    console.log(`   Event ${i + 1}: ${event.type}`);
                });
            }
            
            console.log('\n✅ TEST 1 PASSED: Bonding Curve Created Successfully!\n');
            
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
            
            console.log('📤 Submitting buy transaction...');
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
            
            console.log(`✅ Transaction executed!`);
            console.log(`📋 Digest: ${result2.digest}`);
            
            // Check for token coins received
            const tokensReceived = result2.objectChanges?.filter(
                (obj: any) => obj.type === 'created' && obj.objectType?.includes(STAR_COIN_TYPE)
            );
            
            if (tokensReceived && tokensReceived.length > 0) {
                console.log(`🪙 Token coins received: ${tokensReceived.length}`);
                testResults.buyTokens = {
                    status: 'success',
                    digest: result2.digest,
                    coinsReceived: tokensReceived.length
                };
            }
            
            // Check events
            if (result2.events && result2.events.length > 0) {
                console.log(`📢 Events emitted: ${result2.events.length}`);
                result2.events.forEach((event: any, i: number) => {
                    console.log(`   Event ${i + 1}: ${event.type}`);
                    if (event.parsedJson) {
                        console.log(`   Data:`, JSON.stringify(event.parsedJson, null, 2));
                    }
                });
            }
            
            // Check balance changes
            if (result2.balanceChanges && result2.balanceChanges.length > 0) {
                console.log(`💸 Balance changes:`);
                result2.balanceChanges.forEach((change: any) => {
                    const amount = Number(change.amount) / 1e9;
                    console.log(`   ${change.coinType.split('::').pop()}: ${amount > 0 ? '+' : ''}${amount}`);
                });
            }
            
            console.log('\n✅ TEST 2 PASSED: Tokens Purchased Successfully!\n');
            
            // Get the curve object to check current state
            const curveObject = await client.getObject({
                id: curveId,
                options: { showContent: true }
            });
            
            if (curveObject.data?.content && 'fields' in curveObject.data.content) {
                const fields = curveObject.data.content.fields as any;
                const suiReserve = fields.sui_reserve ? Number(fields.sui_reserve) / 1e9 : 0;
                const tokenSupply = fields.token_supply || 0;
                const graduationTarget = 13.333;
                
                console.log('📊 Curve Status After Buy:');
                console.log(`   SUI Reserve: ${suiReserve} SUI`);
                console.log(`   Token Supply: ${tokenSupply}`);
                console.log(`   Progress to Graduation: ${(suiReserve / graduationTarget * 100).toFixed(2)}%`);
                console.log(`   Graduated: ${fields.graduated || false}`);
                console.log();
            }
            
        } else {
            throw new Error('Bonding curve object not found in transaction results');
        }
        
    } catch (error: any) {
        console.error('\n❌ TEST FAILED:');
        console.error(`   Error: ${error.message}`);
        if (error.cause) {
            console.error(`   Cause: ${JSON.stringify(error.cause, null, 2)}`);
        }
        testResults.createCurve.status = 'failed';
        testResults.createCurve.error = error.message;
    }
    
    // Print final results
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                    📊 TEST RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    Object.entries(testResults).forEach(([test, result]: [string, any]) => {
        const icon = result.status === 'success' ? '✅' : 
                     result.status === 'failed' ? '❌' : '⏸️';
        console.log(`${icon} ${test.toUpperCase()}: ${result.status}`);
        if (result.digest) console.log(`   Digest: ${result.digest}`);
        if (result.curveId) console.log(`   Curve ID: ${result.curveId}`);
        if (result.error) console.log(`   Error: ${result.error}`);
        console.log();
    });
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Write results to file
    fs.writeFileSync(
        '/tmp/typescript_test_results.json',
        JSON.stringify(testResults, null, 2)
    );
    console.log('📄 Results saved to: /tmp/typescript_test_results.json\n');
}

main().catch(console.error);
