// @ts-nocheck
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const keypair = Ed25519Keypair.deriveKeypair('royal stairs eye dizzy response educate fire edge smooth cruise skill say');

const CETUS_PKG = '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12';
const CETUS_CONFIG = '0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e';
const CETUS_POOLS = '0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2';

// Use an existing coin - FIX_MEMEFI from our earlier test
const TEST_COIN_TYPE = '0x0f390325a0c7702d67867f1ab28b5777b6a936e759d51f4601c9988d02128be6::fix_memefi::FIX_MEMEFI';
const TEST_COIN_METADATA = '0x706dfc0b9db9c92c6d8f908d273b21484f3a9ce634afb8f9ba9050643319ea48';

const SUILFG_TYPE = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::SUILFG_MEMEFI';
const SUILFG_METADATA = '0x336cd28e6c1aefecf565fe52011cb5c9959b88b7f809df3085e207b87e53c8aa';
const FAUCET = '0xd5c81489322b9e74609be2986c02652390feba41f06e4a7fd936a2c312fb9dde';
const ADMIN_CAP = '0xf1744f87cabafbd46f4bb9de9d7a94393799543fbe68867d7b4dd4632773c69e';

const CLOCK = '0x6';

console.log('🧪 SIMPLE CETUS POOL TEST\n');
console.log('Testing: SUILFG <> FIX_MEMEFI pool\n');

async function main() {
  // Step 1: Get existing FIX coins from our wallet
  console.log('📦 Step 1: Finding FIX_MEMEFI coins in wallet...\n');
  
  const objects = await client.getOwnedObjects({
    owner: keypair.getPublicKey().toSuiAddress(),
    options: { showType: true, showContent: true },
  });
  
  let fixCoinId = null;
  let suilfgCoinId = null;
  
  for (const obj of objects.data) {
    const type = obj.data?.type || '';
    if (type.includes('FIX_MEMEFI') && type.includes('Coin<')) {
      fixCoinId = obj.data.objectId;
      console.log(`   ✅ Found FIX coin: ${fixCoinId}`);
    }
    if (type.includes('SUILFG_MEMEFI') && type.includes('Coin<') && !suilfgCoinId) {
      suilfgCoinId = obj.data.objectId;
      console.log(`   ✅ Found SUILFG coin: ${suilfgCoinId}`);
    }
    if (fixCoinId && suilfgCoinId) break;
  }
  
  console.log('');
  
  // If we don't have coins, mint some
  if (!fixCoinId || !suilfgCoinId) {
    console.log('💰 Minting fresh coins...\n');
    
    const mintTx = new Transaction();
    
    if (!suilfgCoinId) {
      const suilfgCoin = mintTx.moveCall({
        target: '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::faucet::admin_mint',
        arguments: [
          mintTx.object(FAUCET),
          mintTx.object(ADMIN_CAP),
          mintTx.pure.u64(10_000_000_000_000), // 10K
        ],
      });
      mintTx.transferObjects([suilfgCoin], keypair.getPublicKey().toSuiAddress());
    }
    
    mintTx.setGasBudget(100_000_000);
    
    const mintRes = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: mintTx,
      options: { showObjectChanges: true },
    });
    
    // Get the new coin
    for (const obj of mintRes.objectChanges || []) {
      if (obj.type === 'created' && obj.objectType?.includes('SUILFG')) {
        suilfgCoinId = obj.objectId;
      }
    }
    
    console.log(`   ✅ Minted SUILFG: ${suilfgCoinId}\n`);
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Re-query for FIX
    const objects2 = await client.getOwnedObjects({
      owner: keypair.getPublicKey().toSuiAddress(),
      options: { showType: true },
    });
    
    for (const obj of objects2.data) {
      const type = obj.data?.type || '';
      if (type.includes('FIX_MEMEFI') && type.includes('Coin<')) {
        fixCoinId = obj.data.objectId;
        break;
      }
    }
  }
  
  console.log(`Using coins:`);
  console.log(`   SUILFG: ${suilfgCoinId}`);
  console.log(`   FIX: ${fixCoinId}\n`);
  
  // Step 2: Create Cetus pool
  console.log('🏊 Step 2: Creating Cetus pool...\n');
  
  const poolTx = new Transaction();
  
  const [positionNFT, refundA, refundB] = poolTx.moveCall({
    target: `${CETUS_PKG}::pool_creator::create_pool_v2`,
    typeArguments: [SUILFG_TYPE, TEST_COIN_TYPE],
    arguments: [
      poolTx.object(CETUS_CONFIG),
      poolTx.object(CETUS_POOLS),
      poolTx.pure.u32(60),
      poolTx.pure.u128('18446744073709551616'),
      poolTx.pure.string('SUILFG/FIX Test'),
      poolTx.pure.u32(4294523),
      poolTx.pure.u32(4295323),
      poolTx.object(suilfgCoinId),
      poolTx.object(fixCoinId),
      poolTx.object(SUILFG_METADATA),
      poolTx.object(TEST_COIN_METADATA),
      poolTx.pure.bool(false),
      poolTx.object(CLOCK),
    ],
  });
  
  poolTx.transferObjects([positionNFT, refundA, refundB], keypair.getPublicKey().toSuiAddress());
  poolTx.setGasBudget(500_000_000);
  
  console.log('🚀 Executing...\n');
  
  const poolRes = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: poolTx,
    options: { showEffects: true, showObjectChanges: true },
  });
  
  console.log(`TX: ${poolRes.digest}`);
  console.log(`Status: ${poolRes.effects?.status?.status}\n`);
  
  if (poolRes.effects?.status?.status === 'success') {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  🎉🎉🎉 SUCCESS! POOL CREATED! 🎉🎉🎉                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('✅ Pools address WORKS:');
    console.log(`   ${CETUS_POOLS}\n`);
    
    console.log('📦 Created objects:');
    for (const obj of poolRes.objectChanges || []) {
      if (obj.type === 'created') {
        const name = obj.objectType?.split('::').pop() || 'Object';
        console.log(`   ${name}: ${obj.objectId}`);
      }
    }
    
    console.log('\n🎯 Now we can use these exact parameters for bonding curve!');
    
  } else {
    console.log(`❌ Failed: ${poolRes.effects?.status?.error}\n`);
    
    const error = poolRes.effects?.status?.error || '';
    if (error.includes('0x6')) {
      console.log('💡 Abort 0x6 likely means:');
      console.log('   - Pool already exists (E_POOL_ALREADY_EXISTS)');
      console.log('   - Or invalid tick spacing / fee tier');
    }
  }
}

main().catch(console.error);
