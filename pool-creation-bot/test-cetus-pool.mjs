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
    // Initialize Cetus CLMM SDK (exactly like the bot does)
    const sdkOptions = {
      fullRpcUrl: RPC_URL,
      simulationAccount: {
        address: this.address,
      },
    };

    this.cetusSDK = new CetusClmmSDK(sdkOptions);
    console.log('✅ Cetus SDK initialized');
    
    // The SDK uses _pool (private) not Pool
    console.log('   Checking available methods...');
    console.log('   SDK._pool methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.cetusSDK._pool)));
    console.log('   SDK.Pool?:', typeof this.cetusSDK.Pool);
    console.log('   SDK._pool?:', typeof this.cetusSDK._pool);

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
    const uniqueTypes = new Set(allCoins.data.map(c => c.coinType));
    
    console.log(`  Total coin types: ${uniqueTypes.size}`);
    for (const coinType of uniqueTypes) {
      const coins = allCoins.data.filter(c => c.coinType === coinType);
      const total = coins.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
      const shortType = coinType.split('::').pop() || coinType;
      console.log(`  - ${shortType}: ${total / BigInt(1_000_000_000)} (${coins.length} coins)`);
    }
    
    return Array.from(uniqueTypes);
  }

  sortCoinTypes(coinA, coinB) {
    return coinA.localeCompare(coinB) < 0 ? [coinA, coinB] : [coinB, coinA];
  }

  priceToSqrtPrice(price) {
    const sqrtPrice = Math.sqrt(price) * Math.pow(2, 64);
    return BigInt(Math.floor(sqrtPrice));
  }

  async createPool(tokenCoinType, amountFaucet, amountToken) {
    console.log('\n🏊 Creating Cetus Pool...');
    console.log(`  Token: ${tokenCoinType.split('::').pop()}`);
    console.log(`  Faucet amount: ${amountFaucet / BigInt(1_000_000_000)} tokens`);
    console.log(`  Token amount: ${amountToken / BigInt(1_000_000_000)} tokens`);
    
    // Determine coin order (lexicographic)
    const [coinA, coinB] = this.sortCoinTypes(PAYMENT_COIN_TYPE, tokenCoinType);
    const isPaymentCoinA = coinA === PAYMENT_COIN_TYPE;
    
    console.log(`  Coin A: ${coinA.split('::').pop()}`);
    console.log(`  Coin B: ${coinB.split('::').pop()}`);
    
    // Calculate sqrt price
    const price = isPaymentCoinA 
      ? Number(amountToken) / Number(amountFaucet)
      : Number(amountFaucet) / Number(amountToken);
    
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

  async addLiquidity(poolAddress, tokenCoinType, amountFaucet, amountToken) {
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
      
      // Find a token to pair with faucet (not faucet itself)
      const tokenTypes = coinTypes.filter(t => t !== PAYMENT_COIN_TYPE);
      
      if (tokenTypes.length === 0) {
        console.log('\n❌ No other tokens found in wallet besides faucet token');
        console.log('   Need at least 2 different token types to create a pool');
        return;
      }
      
      const tokenCoinType = tokenTypes[0];
      console.log(`\n✅ Will create pool: Faucet / ${tokenCoinType.split('::').pop()}`);
      
      // Use small amounts for testing
      const amountFaucet = BigInt(1000) * BigInt(1_000_000_000); // 1000 tokens
      const amountToken = BigInt(100) * BigInt(1_000_000_000);   // 100 tokens
      
      // Step 1: Create pool
      const poolAddress = await this.createPool(tokenCoinType, amountFaucet, amountToken);
      
      // Step 2: Add liquidity
      const positionId = await this.addLiquidity(poolAddress, tokenCoinType, amountFaucet, amountToken);
      
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
