/**
 * Recovery script for curves that have lp_seeded=true but no Cetus pool
 * This happens when prepare_pool_liquidity succeeds but pool creation fails
 */

import 'dotenv/config';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { CetusClmmSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { CetusBurnSDK } from '@cetusprotocol/cetus-burn-sdk';

const CONFIG = {
  rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
  network: process.env.NETWORK || 'testnet',
  platformPackage: process.env.PLATFORM_PACKAGE,
  paymentCoinType: process.env.PAYMENT_COIN_TYPE || '0x2::sui::SUI',
  tickSpacing: parseInt(process.env.TICK_SPACING || '200'),
};

// Orphaned graduations - add more as needed
const ORPHANED_CURVES = [
  {
    curveId: '0xf79cb75957032816d202237d1dfe7e540742d5affff5f525aa68f624f1f0ec33',
    coinType: '0x5d14c24157b667b7bd7707386f3223e9e0923c4b806df9358fd4412ba9fc1e93::tokyo::TOKYO',
    name: 'TOKYO',
  },
  // Add more here if needed
];

class PoolRecovery {
  constructor() {
    this.client = new SuiClient({ url: CONFIG.rpcUrl });
    
    // Initialize keypair
    if (process.env.WALLET_SEED_PHRASE) {
      this.keypair = Ed25519Keypair.deriveKeypair(process.env.WALLET_SEED_PHRASE);
    } else if (process.env.WALLET_PRIVATE_KEY) {
      const { schema, secretKey } = decodeSuiPrivateKey(process.env.WALLET_PRIVATE_KEY);
      this.keypair = Ed25519Keypair.fromSecretKey(secretKey);
    } else {
      throw new Error('No wallet credentials found');
    }
    
    this.botAddress = this.keypair.toSuiAddress();
    
    // Initialize Cetus SDK
    this.cetusSDK = new CetusClmmSDK({
      network: CONFIG.network,
      rpcUrl: CONFIG.rpcUrl,
    });
    
    // Initialize Burn SDK
    this.burnSDK = new CetusBurnSDK({
      network: CONFIG.network,
      rpcUrl: CONFIG.rpcUrl,
    });
  }

  async findCoinsForCurve(coinType) {
    console.log(`\n🔍 Finding coins for ${coinType}...`);
    
    // Get all SUI coins
    const suiCoins = await this.client.getCoins({
      owner: this.botAddress,
      coinType: CONFIG.paymentCoinType,
    });
    
    // Get all token coins
    const tokenCoins = await this.client.getCoins({
      owner: this.botAddress,
      coinType: coinType,
    });
    
    console.log(`Found ${suiCoins.data.length} SUI coins, ${tokenCoins.data.length} token coins`);
    
    // Get the largest of each (should be the LP coins)
    const suiCoin = suiCoins.data.sort((a, b) => parseInt(b.balance) - parseInt(a.balance))[0];
    const tokenCoin = tokenCoins.data.sort((a, b) => parseInt(b.balance) - parseInt(a.balance))[0];
    
    if (!suiCoin || !tokenCoin) {
      throw new Error('Cannot find coins in wallet!');
    }
    
    const suiAmount = BigInt(suiCoin.balance);
    const tokenAmount = BigInt(tokenCoin.balance);
    
    console.log(`✅ Found coins:`);
    console.log(`  SUI: ${suiAmount / BigInt(1_000_000_000)} SUI (${suiCoin.coinObjectId})`);
    console.log(`  Token: ${tokenAmount / BigInt(1_000_000_000)} tokens (${tokenCoin.coinObjectId})`);
    
    return {
      suiCoinId: suiCoin.coinObjectId,
      suiAmount,
      tokenAmount,
    };
  }

  sortCoinTypes(coinA, coinB) {
    return coinA.localeCompare(coinB) < 0 ? [coinA, coinB] : [coinB, coinA];
  }

  priceToSqrtPrice(price) {
    const sqrtPrice = Math.sqrt(price) * Math.pow(2, 64);
    return BigInt(Math.floor(sqrtPrice));
  }

  async createPool(coinType, suiAmount, tokenAmount, suiCoinId) {
    console.log(`\n🏊 Creating Cetus pool...`);
    
    const [coinA, coinB] = this.sortCoinTypes(CONFIG.paymentCoinType, coinType);
    const isPaymentCoinA = coinA === CONFIG.paymentCoinType;
    
    const price = isPaymentCoinA 
      ? Number(tokenAmount) / Number(suiAmount)
      : Number(suiAmount) / Number(tokenAmount);
    
    const sqrtPrice = this.priceToSqrtPrice(price);
    
    console.log(`Pool parameters:`);
    console.log(`  coinA: ${coinA.slice(0, 30)}...`);
    console.log(`  coinB: ${coinB.slice(0, 30)}...`);
    console.log(`  price: ${price}`);
    console.log(`  sqrtPrice: ${sqrtPrice}`);
    
    const createPoolPayload = await this.cetusSDK.Pool.createPoolTransactionPayload({
      coinTypeA: coinA,
      coinTypeB: coinB,
      tickSpacing: CONFIG.tickSpacing,
      initializeSqrtPrice: sqrtPrice.toString(),
      uri: '',
    });
    
    if (suiCoinId) {
      createPoolPayload.setGasPayment([{ objectId: suiCoinId, version: null, digest: null }]);
    }
    
    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: createPoolPayload,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
    
    if (result.effects?.status?.status !== 'success') {
      throw new Error(`Pool creation failed: ${result.effects?.status?.error}`);
    }
    
    // Extract pool address
    const poolCreatedEvent = result.events?.find(e => 
      e.type.includes('::pool::PoolCreatedEvent') ||
      e.type.includes('::factory::CreatePoolEvent')
    );
    
    const poolAddress = poolCreatedEvent?.parsedJson?.pool_id || 
                       poolCreatedEvent?.parsedJson?.pool;
    
    if (!poolAddress) {
      throw new Error('Could not extract pool address from events');
    }
    
    console.log(`✅ Pool created: ${poolAddress}`);
    console.log(`   TX: ${result.digest}`);
    
    return poolAddress;
  }

  async addLiquidity(poolAddress, coinType, suiAmount, tokenAmount, suiCoinId) {
    console.log(`\n💧 Adding liquidity...`);
    
    // Wait for pool to be indexed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const pool = await this.cetusSDK.Pool.getPool(poolAddress);
    
    // Full range position
    const lowerTick = pool.tickSpacing * Math.floor(-443636 / pool.tickSpacing);
    const upperTick = pool.tickSpacing * Math.floor(443636 / pool.tickSpacing);
    
    const openPositionPayload = await this.cetusSDK.Position.openPositionTransactionPayload({
      poolAddress,
      tickLower: lowerTick.toString(),
      tickUpper: upperTick.toString(),
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
    });
    
    const addLiquidityPayload = await this.cetusSDK.Position.addLiquidityTransactionPayload({
      poolAddress,
      positionId: openPositionPayload.positionId,
      deltaLiquidity: '1000000',
      maxAmountA: suiAmount.toString(),
      maxAmountB: tokenAmount.toString(),
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
    });
    
    if (suiCoinId) {
      addLiquidityPayload.setGasPayment([{ objectId: suiCoinId, version: null, digest: null }]);
    }
    
    const result = await this.client.signAndExecuteTransaction({
      signer: this.keypair,
      transaction: addLiquidityPayload,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    if (result.effects?.status?.status !== 'success') {
      throw new Error(`Add liquidity failed: ${result.effects?.status?.error}`);
    }
    
    console.log(`✅ Liquidity added: ${openPositionPayload.positionId}`);
    console.log(`   TX: ${result.digest}`);
    
    return openPositionPayload.positionId;
  }

  async burnLP(poolAddress, suiCoinId) {
    console.log(`\n🔥 Burning LP tokens...`);
    
    // Get positions for this pool
    const positions = await this.client.getOwnedObjects({
      owner: this.botAddress,
      filter: { StructType: `${this.cetusSDK.sdkOptions.clmm_pool.config.packageId}::position::Position` },
      options: { showContent: true },
    });
    
    const poolPositions = positions.data.filter(pos => {
      const fields = pos.data?.content?.fields;
      return fields?.pool === poolAddress;
    });
    
    if (poolPositions.length === 0) {
      throw new Error('No positions found for this pool');
    }
    
    console.log(`Found ${poolPositions.length} position(s) to burn`);
    
    for (const pos of poolPositions) {
      const positionId = pos.data.objectId;
      
      const burnPayload = await this.burnSDK.BurnLP.burnLPTransactionPayload({
        positionId,
      });
      
      if (suiCoinId) {
        burnPayload.setGasPayment([{ objectId: suiCoinId, version: null, digest: null }]);
      }
      
      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: burnPayload,
        options: { showEffects: true },
      });
      
      if (result.effects?.status?.status !== 'success') {
        throw new Error(`Burn failed: ${result.effects?.status?.error}`);
      }
      
      console.log(`✅ Position burned: ${positionId}`);
      console.log(`   TX: ${result.digest}`);
    }
  }

  async recoverCurve(curve) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔧 Recovering ${curve.name} (${curve.curveId.slice(0, 20)}...)`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // Step 1: Find coins
      const { suiCoinId, suiAmount, tokenAmount } = await this.findCoinsForCurve(curve.coinType);
      
      // Step 2: Create pool
      const poolAddress = await this.createPool(curve.coinType, suiAmount, tokenAmount, suiCoinId);
      
      // Step 3: Add liquidity
      await this.addLiquidity(poolAddress, curve.coinType, suiAmount, tokenAmount, suiCoinId);
      
      // Step 4: Burn LP
      await this.burnLP(poolAddress, suiCoinId);
      
      console.log(`\n✅ ${curve.name} recovery complete!`);
      console.log(`   Pool: ${poolAddress}`);
      
      return { success: true, poolAddress };
    } catch (error) {
      console.error(`\n❌ ${curve.name} recovery failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async run() {
    console.log(`\n🚀 Starting pool recovery...`);
    console.log(`Bot address: ${this.botAddress}`);
    console.log(`Curves to recover: ${ORPHANED_CURVES.length}`);
    
    const results = [];
    
    for (const curve of ORPHANED_CURVES) {
      const result = await this.recoverCurve(curve);
      results.push({ curve: curve.name, ...result });
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Recovery Summary`);
    console.log(`${'='.repeat(60)}`);
    
    for (const result of results) {
      console.log(`${result.success ? '✅' : '❌'} ${result.curve}: ${result.success ? result.poolAddress : result.error}`);
    }
  }
}

// Run recovery
const recovery = new PoolRecovery();
recovery.run().catch(console.error);
