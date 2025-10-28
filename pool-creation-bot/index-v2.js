#!/usr/bin/env node

/**
 * SuiLFG Pool Creation Bot (v2 - With Fee Collection)
 * 
 * Automatically creates Cetus pools and LOCKS LP (doesn't burn)
 * This allows the platform to claim trading fees!
 * 
 * Flow:
 * 1. Monitor blockchain for graduation events
 * 2. Call prepare_liquidity_for_bot() to extract liquidity
 * 3. Create Cetus pool using Cetus SDK (0.25% fee tier)
 * 4. Add liquidity to pool (full range)
 * 5. LOCK LP position (transfer to locker, can still claim fees)
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';
import { CetusClmmSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import dotenv from 'dotenv';
import { createLogger } from './logger.js';

dotenv.config();

const logger = createLogger();

// Configuration
const CONFIG = {
  network: process.env.NETWORK || 'testnet',
  rpcUrl: process.env.RPC_URL || 'https://fullnode.testnet.sui.io:443',
  platformPackage: process.env.PLATFORM_PACKAGE,
  platformState: process.env.PLATFORM_STATE,
  adminCap: process.env.ADMIN_CAP,
  cetusGlobalConfig: process.env.CETUS_GLOBAL_CONFIG,
  cetusPools: process.env.CETUS_POOLS,
  tickSpacing: parseInt(process.env.TICK_SPACING || '60'), // 0.25% fee tier
  lpLockerAddress: process.env.LP_LOCKER_ADDRESS, // Where to lock LP (can claim fees)
  pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '10000'),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  gasBudget: parseInt(process.env.GAS_BUDGET || '100000000'),
};

// State tracking
let processedGraduations = new Set();
let lastCheckedCursor = null;

class PoolCreationBot {
  constructor() {
    this.client = new SuiClient({ url: CONFIG.rpcUrl });
    this.initializeKeypair();
    this.initializeCetusSDK();
  }

  initializeKeypair() {
    const privateKey = process.env.BOT_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('BOT_PRIVATE_KEY not set in environment');
    }

    const keyHex = privateKey.replace(/^suiprivkey/, '');
    this.keypair = Ed25519Keypair.fromSecretKey(fromHEX(keyHex));
    this.botAddress = this.keypair.getPublicKey().toSuiAddress();

    logger.info('Bot initialized', { address: this.botAddress });
  }

  async initializeCetusSDK() {
    try {
      const sdkOptions = {
        fullRpcUrl: CONFIG.rpcUrl,
        simulationAccount: {
          address: this.botAddress,
        },
      };

      this.cetusSDK = new CetusClmmSDK(sdkOptions);
      logger.info('Cetus SDK initialized');
      logger.info('Fee tier: 0.25% (tick spacing 60)');
      logger.info('LP locking enabled - fees can be claimed!');
    } catch (error) {
      logger.error('Failed to initialize Cetus SDK', { error: error.message });
      throw error;
    }
  }

  async start() {
    logger.info('🤖 Pool Creation Bot Started', {
      network: CONFIG.network,
      pollingInterval: CONFIG.pollingInterval,
      lpLocker: CONFIG.lpLockerAddress || 'Not configured (will use bot address)',
    });

    // Main loop
    while (true) {
      try {
        await this.checkForGraduations();
        await this.sleep(CONFIG.pollingInterval);
      } catch (error) {
        logger.error('Error in main loop', { error: error.message });
        await this.sleep(CONFIG.pollingInterval * 2);
      }
    }
  }

  async checkForGraduations() {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${CONFIG.platformPackage}::bonding_curve::GraduationEvent`,
        },
        limit: 50,
        order: 'descending',
        ...(lastCheckedCursor ? { cursor: lastCheckedCursor } : {}),
      });

      if (events.data.length > 0) {
        lastCheckedCursor = events.nextCursor;
        
        for (const event of events.data.reverse()) {
          const eventId = event.id.txDigest;
          
          if (processedGraduations.has(eventId)) {
            continue;
          }

          logger.info('🎓 Graduation detected!', {
            txDigest: eventId,
            curveId: event.parsedJson?.curve_id,
          });

          await this.handleGraduation(event);
          processedGraduations.add(eventId);
        }
      }
    } catch (error) {
      logger.error('Error checking graduations', { error: error.message });
    }
  }

  async handleGraduation(event) {
    const curveId = event.parsedJson?.curve_id;
    const coinType = event.parsedJson?.coin_type;

    if (!curveId || !coinType) {
      logger.error('Invalid graduation event', { event });
      return;
    }

    logger.info('Processing graduation', { curveId, coinType });

    try {
      // Step 1: Prepare liquidity
      const positionId = await this.prepareLiquidity(curveId, coinType);

      logger.info('✅ Pool creation complete!', {
        curveId,
        positionId,
        status: 'success',
        note: 'LP locked - fees can be claimed',
      });
    } catch (error) {
      logger.error('Failed to handle graduation', {
        curveId,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  async prepareLiquidity(curveId, coinType) {
    logger.info('📦 Step 1/3: Preparing liquidity', { curveId });

    const tx = new Transaction();

    // Call prepare_liquidity_for_bot
    tx.moveCall({
      target: `${CONFIG.platformPackage}::bonding_curve::prepare_liquidity_for_bot`,
      typeArguments: [coinType],
      arguments: [
        tx.object(CONFIG.adminCap),
        tx.object(CONFIG.platformState),
        tx.object(curveId),
        tx.object('0x6'), // Clock
      ],
    });

    tx.setGasBudget(CONFIG.gasBudget);

    const result = await this.executeTransaction(tx);

    logger.info('✅ Liquidity prepared', {
      txDigest: result.digest,
      note: 'Bot received ~12K SUI + 207M tokens',
    });

    // Wait for indexing
    await this.sleep(3000);

    // Now create pool and add liquidity
    return await this.createPoolAndAddLiquidity(coinType);
  }

  async createPoolAndAddLiquidity(coinType) {
    logger.info('🏊 Step 2/3: Creating Cetus pool', { coinType });

    const paymentCoinType = process.env.PAYMENT_COIN_TYPE || '0x2::sui::SUI';
    const [coinA, coinB] = this.sortCoinTypes(paymentCoinType, coinType);

    try {
      // Create pool with 0.25% fee tier
      const createPoolTx = new Transaction();

      createPoolTx.moveCall({
        target: `${process.env.CETUS_PACKAGE}::pool_creator::create_pool_v2`,
        typeArguments: [coinA, coinB],
        arguments: [
          createPoolTx.object(CONFIG.cetusGlobalConfig),
          createPoolTx.object(CONFIG.cetusPools),
          createPoolTx.pure.u32(CONFIG.tickSpacing), // 60 = 0.25%
          createPoolTx.pure.u128(this.calculateInitialSqrtPrice()), // Based on bonding curve
          createPoolTx.pure.string(''), // URI
          createPoolTx.object('0x6'), // Clock
        ],
      });

      createPoolTx.setGasBudget(CONFIG.gasBudget);

      const poolResult = await this.executeTransaction(createPoolTx);
      const poolAddress = this.extractPoolAddress(poolResult);

      logger.info('✅ Pool created!', {
        poolAddress,
        feeTier: '0.25%',
        tickSpacing: CONFIG.tickSpacing,
      });

      // Wait for pool to be indexed
      await this.sleep(3000);

      // Add liquidity and lock position
      return await this.addLiquidityAndLock(poolAddress, coinType);

    } catch (error) {
      logger.error('Pool creation failed', { error: error.message });
      throw error;
    }
  }

  async addLiquidityAndLock(poolAddress, coinType) {
    logger.info('💧 Step 3/3: Adding liquidity & locking position', { poolAddress });

    try {
      // Get coin balances
      const paymentCoinType = process.env.PAYMENT_COIN_TYPE || '0x2::sui::SUI';
      const paymentCoins = await this.getCoinObjects(paymentCoinType);
      const tokenCoins = await this.getCoinObjects(coinType);

      // Open position and add liquidity using Cetus SDK
      const tx = new Transaction();

      // Full range liquidity
      const tickLower = -443636;
      const tickUpper = 443636;

      // Merge coins if needed
      const paymentCoin = paymentCoins.length > 1 
        ? this.mergeCoins(tx, paymentCoins)
        : tx.object(paymentCoins[0]);
      
      const tokenCoin = tokenCoins.length > 1
        ? this.mergeCoins(tx, tokenCoins)
        : tx.object(tokenCoins[0]);

      // Create position
      const [position] = tx.moveCall({
        target: `${process.env.CETUS_PACKAGE}::position::open_position`,
        typeArguments: [paymentCoinType, coinType],
        arguments: [
          tx.object(CONFIG.cetusGlobalConfig),
          tx.object(poolAddress),
          tx.pure.i32(tickLower),
          tx.pure.i32(tickUpper),
        ],
      });

      // Add liquidity to position
      tx.moveCall({
        target: `${process.env.CETUS_PACKAGE}::position::add_liquidity`,
        typeArguments: [paymentCoinType, coinType],
        arguments: [
          tx.object(CONFIG.cetusGlobalConfig),
          tx.object(poolAddress),
          position,
          paymentCoin,
          tokenCoin,
          tx.pure.u64('1000000000'), // Delta liquidity (SDK calculates)
          tx.object('0x6'), // Clock
        ],
      });

      // Lock position - transfer to locker address
      const lockerAddress = CONFIG.lpLockerAddress || this.botAddress;
      tx.transferObjects([position], lockerAddress);

      tx.setGasBudget(CONFIG.gasBudget);

      const result = await this.executeTransaction(tx);

      logger.info('✅ Liquidity added & LP locked!', {
        lockerAddress,
        txDigest: result.digest,
        note: 'LP locker can now claim trading fees (0.25%)',
      });

      return result.digest;

    } catch (error) {
      logger.error('Add liquidity failed', { error: error.message });
      throw error;
    }
  }

  // Helper functions

  async executeTransaction(tx, retries = 0) {
    try {
      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(result.effects?.status?.error || 'Transaction failed');
      }

      return result;
    } catch (error) {
      if (retries < CONFIG.maxRetries) {
        logger.warn(`Transaction failed, retrying... (${retries + 1}/${CONFIG.maxRetries})`);
        await this.sleep(2000 * (retries + 1));
        return this.executeTransaction(tx, retries + 1);
      }
      throw error;
    }
  }

  sortCoinTypes(coinA, coinB) {
    return coinA < coinB ? [coinA, coinB] : [coinB, coinA];
  }

  calculateInitialSqrtPrice() {
    // Based on bonding curve final price
    // ~12,000 SUI for 207M tokens
    const price = 207_000_000 / 12_000; // tokens per SUI
    const sqrtPrice = Math.sqrt(price);
    const Q64 = 2n ** 64n;
    return BigInt(Math.floor(sqrtPrice * Number(Q64)));
  }

  extractPoolAddress(txResult) {
    const poolObject = txResult.objectChanges?.find(
      (change) => change.type === 'created' && change.objectType?.includes('Pool')
    );
    return poolObject?.objectId;
  }

  async getCoinObjects(coinType) {
    const coins = await this.client.getCoins({
      owner: this.botAddress,
      coinType,
    });
    return coins.data.map(c => c.coinObjectId);
  }

  mergeCoins(tx, coinIds) {
    const [firstCoin, ...restCoins] = coinIds;
    const base = tx.object(firstCoin);
    if (restCoins.length > 0) {
      tx.mergeCoins(base, restCoins.map(id => tx.object(id)));
    }
    return base;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the bot
const bot = new PoolCreationBot();
bot.start().catch((error) => {
  logger.error('Fatal error', { error: error.message, stack: error.stack });
  process.exit(1);
});
