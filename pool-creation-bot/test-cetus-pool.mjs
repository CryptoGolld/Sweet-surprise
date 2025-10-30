/**
 * Test Cetus Pool Creation + Burn
 */

import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { CetusClmmSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { CetusBurnSDK } from '@cetusprotocol/cetus-burn-sdk';

// Test wallet with tokens
const SEED_PHRASE = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';

// Testnet config
const RPC_URL = 'https://fullnode.testnet.sui.io:443';
const NETWORK = 'testnet';

// Cetus config for testnet
const CETUS_CONFIG = {
  globalConfig: '0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666',
  pools: '0x26579d8d8a0d46fa5bb5f0e4a31f84c9b174a88e0f5e0f86f98684c9aa2e61d0',
};

const PAYMENT_COIN_TYPE = '0xcc2461fa74e9c03f7cdc5bf875b31667678101eb953a68429f15239315986461::suilfg_memefi::SUILFG_MEMEFI';

class CetusPoolTester {
  constructor() {
    this.client = new SuiClient({ url: RPC_URL });
    this.keypair = Ed25519Keypair.deriveKeypair(SEED_PHRASE);
    this.address = this.keypair.toSuiAddress();
    
    console.log('\n🔑 Test Wallet:', this.address);
  }

  async init() {
    // Initialize Cetus CLMM SDK with proper configuration
    const sdkOptions = {
      fullRpcUrl: RPC_URL,
      simulationAccount: {
        address: this.address,
      },
      clmm_pool: {
        package_id: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb',
        published_at: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb',
        config: {
          global_config_id: CETUS_CONFIG.globalConfig,
          pools_id: CETUS_CONFIG.pools,
        },
      },
    };

    this.cetusSDK = new CetusClmmSDK(sdkOptions);
    console.log('✅ Cetus SDK initialized');

    // Initialize Burn SDK
    this.burnSDK = new CetusBurnSDK({
      network: NETWORK,
      fullNodeUrl: RPC_URL,
    });
    console.log('✅ Burn SDK initialized');
  }

  async checkWallet() {
    console.log('\n💰 Checking wallet balances...');
    
    // Check all coin types
    const allCoins = await this.client.getAllCoins({ owner: this.address });
    const coinBalances = new Map();
    
    for (const coin of allCoins.data) {
      const current = coinBalances.get(coin.coinType) || BigInt(0);
      coinBalances.set(coin.coinType, current + BigInt(coin.balance));
    }
    
    console.log(`  Total coin types: ${coinBalances.size}`);
    for (const [coinType, balance] of coinBalances) {
      const shortType = coinType.split('::').pop() || coinType;
      const coinCount = allCoins.data.filter(c => c.coinType === coinType).length;
      console.log(`  - ${shortType}: ${balance / BigInt(1_000_000_000)} (${coinCount} coins)`);
    }
    
    // Return only coin types with non-zero balance
    return Array.from(coinBalances.entries())
      .filter(([_, balance]) => balance > BigInt(0))
      .map(([coinType, _]) => coinType);
  }

  sortCoinTypes(coinA, coinB) {
    return coinA.localeCompare(coinB) < 0 ? [coinA, coinB] : [coinB, coinA];
  }

  priceToSqrtPrice(price) {
    const sqrtPrice = Math.sqrt(price) * Math.pow(2, 64);
    return BigInt(Math.floor(sqrtPrice));
  }

  async createPool2(tokenA, tokenB, amountA, amountB) {
    console.log('\n🏊 Creating Cetus Pool...');
    console.log(`  Token A: ${tokenA.split('::').pop()}`);
    console.log(`  Token B: ${tokenB.split('::').pop()}`);
    console.log(`  Amount A: ${amountA / BigInt(1_000_000_000)} tokens`);
    console.log(`  Amount B: ${amountB / BigInt(1_000_000_000)} tokens`);
    
    // Determine coin order (lexicographic)
    const [coinA, coinB] = this.sortCoinTypes(tokenA, tokenB);
    const isTokenACoinA = coinA === tokenA;
    
    console.log(`  Coin A: ${coinA.split('::').pop()}`);
    console.log(`  Coin B: ${coinB.split('::').pop()}`);
    
    // Calculate sqrt price
    const price = isTokenACoinA 
      ? Number(amountB) / Number(amountA)
      : Number(amountA) / Number(amountB);
    
    const sqrtPrice = this.priceToSqrtPrice(price);
    
    console.log(`  Price: ${price}`);
    console.log(`  Sqrt Price: ${sqrtPrice.toString()}`);
    
    try {
      // Create pool (note: SDK has typo "creat" not "create")
      const createPoolPayload = await this.cetusSDK.Pool.creatPoolTransactionPayload({
        coinTypeA: coinA,
        coinTypeB: coinB,
        tickSpacing: 200, // 1% fee tier
        initializeSqrtPrice: sqrtPrice.toString(),
        uri: '',
      });
      
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
      
      // Extract pool address from events
      const poolCreatedEvent = result.events?.find(e => 
        e.type.includes('::pool::PoolCreatedEvent') ||
        e.type.includes('::factory::CreatePoolEvent')
      );
      
      const poolAddress = poolCreatedEvent?.parsedJson?.pool_id || 
                         poolCreatedEvent?.parsedJson?.pool;
      
      if (!poolAddress) {
        console.log('Events:', JSON.stringify(result.events, null, 2));
        throw new Error('Could not extract pool address from events');
      }
      
      console.log('✅ Pool created:', poolAddress);
      console.log('   TX:', result.digest);
      
      return poolAddress;
    } catch (error) {
      console.error('❌ Pool creation failed:', error.message);
      throw error;
    }
  }

  async addLiquidity2(poolAddress, tokenA, tokenB, amountA, amountB) {
    console.log('\n💧 Adding Liquidity...');
    
    // Wait for pool to be indexed
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      // Get pool info
      const pool = await this.cetusSDK.Pool.getPool(poolAddress);
      console.log('  Pool fetched:', pool.coinTypeA.split('::').pop(), '/', pool.coinTypeB.split('::').pop());
      
      // Calculate full range
      const lowerTick = pool.tickSpacing * Math.floor(-443636 / pool.tickSpacing);
      const upperTick = pool.tickSpacing * Math.floor(443636 / pool.tickSpacing);
      
      console.log(`  Tick range: ${lowerTick} to ${upperTick}`);
      
      // Open position
      const openPositionPayload = await this.cetusSDK.Position.openPositionTransactionPayload({
        poolAddress,
        tickLower: lowerTick.toString(),
        tickUpper: upperTick.toString(),
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
      });
      
      console.log('  Position ID:', openPositionPayload.positionId);
      
      // Add liquidity
      const addLiquidityPayload = await this.cetusSDK.Position.addLiquidityTransactionPayload({
        poolAddress,
        positionId: openPositionPayload.positionId,
        deltaLiquidity: '1000000',
        maxAmountA: amountFaucet.toString(),
        maxAmountB: amountToken.toString(),
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
      });
      
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
      
      console.log('✅ Liquidity added!');
      console.log('   TX:', result.digest);
      
      return openPositionPayload.positionId;
    } catch (error) {
      console.error('❌ Add liquidity failed:', error.message);
      throw error;
    }
  }

  async burnLP(poolAddress) {
    console.log('\n🔥 Burning LP Position...');
    
    try {
      // Get all positions for this wallet
      const positions = await this.client.getOwnedObjects({
        owner: this.address,
        filter: { 
          StructType: `${this.cetusSDK.sdkOptions.clmm_pool.package_id}::position::Position` 
        },
        options: { showContent: true },
      });
      
      // Find position for this pool
      const poolPositions = positions.data.filter(pos => {
        const fields = pos.data?.content?.fields;
        return fields?.pool === poolAddress;
      });
      
      if (poolPositions.length === 0) {
        throw new Error('No positions found for this pool');
      }
      
      console.log(`  Found ${poolPositions.length} position(s) to burn`);
      
      for (const pos of poolPositions) {
        const positionId = pos.data.objectId;
        console.log(`  Burning position: ${positionId}`);
        
        const burnPayload = await this.burnSDK.BurnLP.burnLPTransactionPayload({
          positionId,
        });
        
        const result = await this.client.signAndExecuteTransaction({
          signer: this.keypair,
          transaction: burnPayload,
          options: { 
            showEffects: true,
            showEvents: true,
          },
        });
        
        if (result.effects?.status?.status !== 'success') {
          throw new Error(`Burn failed: ${result.effects?.status?.error}`);
        }
        
        console.log('✅ Position burned!');
        console.log('   TX:', result.digest);
        console.log('   Note: LP is locked but fees can still be claimed');
      }
    } catch (error) {
      console.error('❌ Burn failed:', error.message);
      throw error;
    }
  }

  async run() {
    console.log('\n🧪 Cetus Pool Creation + Burn Test');
    console.log('='.repeat(50));
    
    try {
      await this.init();
      
      const coinTypes = await this.checkWallet();
      
      // Find tokens with substantial balance (> 1000 tokens to ensure we have enough)
      const minBalance = BigInt(1000) * BigInt(1_000_000_000);
      const allCoins = await this.client.getAllCoins({ owner: this.address });
      const coinBalances = new Map();
      
      for (const coin of allCoins.data) {
        const current = coinBalances.get(coin.coinType) || BigInt(0);
        coinBalances.set(coin.coinType, current + BigInt(coin.balance));
      }
      
      const substantialTokens = Array.from(coinBalances.entries())
        .filter(([_, balance]) => balance > minBalance)
        .map(([coinType, _]) => coinType);
      
      if (substantialTokens.length < 2) {
        console.log('\n❌ Need at least 2 tokens with balance > 1000 to create pool');
        return;
      }
      
      // Use first two tokens with substantial balance
      const tokenA = substantialTokens[0];
      const tokenB = substantialTokens[1];
      
      console.log(`\n✅ Will create pool: ${tokenA.split('::').pop()} / ${tokenB.split('::').pop()}`);
      
      // Use small amounts for testing
      const amountA = BigInt(100) * BigInt(1_000_000_000); // 100 tokens
      const amountB = BigInt(100) * BigInt(1_000_000_000);   // 100 tokens
      
      // Step 1: Create pool between tokenA and tokenB
      const poolAddress = await this.createPool2(tokenA, tokenB, amountA, amountB);
      
      // Step 2: Add liquidity
      const positionId = await this.addLiquidity2(poolAddress, tokenA, tokenB, amountA, amountB);
      
      // Step 3: Burn LP
      await this.burnLP(poolAddress);
      
      console.log('\n' + '='.repeat(50));
      console.log('✅ TEST COMPLETE!');
      console.log('   Pool Address:', poolAddress);
      console.log('   All steps succeeded - bot logic should work!');
      
    } catch (error) {
      console.error('\n' + '='.repeat(50));
      console.error('❌ TEST FAILED!');
      console.error('   Error:', error.message);
      if (error.stack) console.error('   Stack:', error.stack);
      process.exit(1);
    }
  }
}

// Run test
const tester = new CetusPoolTester();
tester.run().catch(console.error);
