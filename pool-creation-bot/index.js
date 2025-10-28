#!/usr/bin/env node

/**
 * SuiLFG Pool Creation Bot
 * 
 * Automatically creates Cetus pools and burns LP for graduated tokens
 * 
 * Flow:
 * 1. Monitor blockchain for graduation events
 * 2. Call prepare_liquidity_for_bot() to extract liquidity
 * 3. Create Cetus pool using Cetus SDK
 * 4. Add liquidity to pool
 * 5. Burn LP tokens using Cetus Burn Manager (permanent lock)
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';
import { CetusClmmSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { BurnManager } from '@cetusprotocol/cetus-lp-burn-sdk';
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
  tickSpacing: parseInt(process.env.TICK_SPACING || '200'), // 1% fee tier
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
    this.initializeBurnManager();
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
      logger.info('Pool configuration: 1% fee tier (tick spacing 200)');
    } catch (error) {
      logger.error('Failed to initialize Cetus SDK', { error: error.message });
      throw error;
    }
  }

  async initializeBurnManager() {
    try {
      this.burnManager = new BurnManager({
        network: CONFIG.network,
        client: this.client,
      });
      logger.info('Cetus Burn Manager initialized');
      logger.info('LP will be burned but fees can still be claimed! 🔥');
    } catch (error) {
      logger.error('Failed to initialize Burn Manager', { error: error.message });
      throw error;
    }
  }

  async start() {
    logger.info('🤖 Pool Creation Bot Started', {
      network: CONFIG.network,
      pollingInterval: CONFIG.pollingInterval,
    });

    // Main loop
    while (true) {
      try {
        await this.checkForGraduations();
        await this.sleep(CONFIG.pollingInterval);
      } catch (error) {
        logger.error('Error in main loop', { error: error.message });
        await this.sleep(CONFIG.pollingInterval * 2); // Back off on error
      }
    }
  }

  async checkForGraduations() {
    try {
      // Query graduation events
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
            continue; // Already processed
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
      // Step 1: Prepare liquidity (extract from curve)
      const { suiAmount, tokenAmount } = await this.prepareLiquidity(curveId, coinType);

      // Step 2: Create Cetus pool (1% fee tier)
      const poolAddress = await this.createCetusPool(coinType, suiAmount, tokenAmount);

      // Step 3: Burn LP tokens (permanent lock, but can still claim fees!)
      await this.burnLPTokens(poolAddress, coinType);

      logger.info('✅ Pool creation complete!', {
        curveId,
        poolAddress,
        status: 'success',
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
    logger.info('📦 Preparing liquidity', { curveId });

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

    // Extract amounts from transaction effects
    const suiAmount = await this.getSuiBalanceFromResult(result);
    const tokenAmount = await this.getTokenBalanceFromResult(result, coinType);

    logger.info('Liquidity prepared', {
      suiAmount: suiAmount.toString(),
      tokenAmount: tokenAmount.toString(),
    });

    return { suiAmount, tokenAmount };
  }

  async createCetusPool(coinType, suiAmount, tokenAmount) {
    logger.info('🏊 Creating Cetus pool', { coinType });

    // Determine coin order (Cetus requires lexicographic order)
    const paymentCoinType = process.env.PAYMENT_COIN_TYPE || '0x2::sui::SUI';
    const [coinA, coinB] = this.sortCoinTypes(paymentCoinType, coinType);
    const isPaymentCoinA = coinA === paymentCoinType;

    // Calculate initial sqrt price
    const price = isPaymentCoinA 
      ? Number(tokenAmount) / Number(suiAmount)
      : Number(suiAmount) / Number(tokenAmount);
    
    const sqrtPrice = this.priceToSqrtPrice(price);

    logger.info('Pool parameters', {
      coinA,
      coinB,
      price,
      sqrtPrice,
      tickSpacing: CONFIG.tickSpacing,
    });

    try {
      // Create pool using Cetus SDK
      const createPoolPayload = await this.cetusSDK.Pool.createPoolTransactionPayload({
        coinTypeA: coinA,
        coinTypeB: coinB,
        tickSpacing: CONFIG.tickSpacing, // 200 = 1% fee tier
        initializeSqrtPrice: sqrtPrice.toString(),
        uri: '',
      });

      logger.info('Creating pool with 1% fees', {
        coinA: coinA.slice(0, 20) + '...',
        coinB: coinB.slice(0, 20) + '...',
        feeTier: '1%',
        tickSpacing: CONFIG.tickSpacing,
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
      const poolAddress = this.extractPoolAddress(result);

      logger.info('✅ Pool created!', {
        poolAddress,
        txDigest: result.digest,
      });

      // Wait for pool to be indexed
      await this.sleep(3000);

      // Add liquidity
      await this.addLiquidity(poolAddress, coinType, suiAmount, tokenAmount);

      return poolAddress;
    } catch (error) {
      logger.error('Pool creation failed', { error: error.message });
      throw error;
    }
  }

  async addLiquidity(poolAddress, coinType, suiAmount, tokenAmount) {
    logger.info('💧 Adding liquidity', { poolAddress });

    try {
      // Get pool info
      const pool = await this.cetusSDK.Pool.getPool(poolAddress);

      // Calculate position range (full range)
      const lowerTick = pool.tickSpacing * Math.floor(-443636 / pool.tickSpacing);
      const upperTick = pool.tickSpacing * Math.floor(443636 / pool.tickSpacing);

      // Open position and add liquidity
      const openPositionPayload = await this.cetusSDK.Position.openPositionTransactionPayload({
        poolAddress,
        tickLower: lowerTick.toString(),
        tickUpper: upperTick.toString(),
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
      });

      // Get coin objects
      const paymentCoinType = process.env.PAYMENT_COIN_TYPE || '0x2::sui::SUI';
      const [coinAObjects, coinBObjects] = pool.coinTypeA === paymentCoinType
        ? [await this.getCoinObjects(paymentCoinType), await this.getCoinObjects(coinType)]
        : [await this.getCoinObjects(coinType), await this.getCoinObjects(paymentCoinType)];

      // Add liquidity to position
      const addLiquidityPayload = await this.cetusSDK.Position.addLiquidityTransactionPayload({
        poolAddress,
        positionId: openPositionPayload.positionId,
        deltaLiquidity: '1000000', // Will be calculated by SDK
        maxAmountA: suiAmount.toString(),
        maxAmountB: tokenAmount.toString(),
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

      logger.info('✅ Liquidity added!', {
        positionId: openPositionPayload.positionId,
        txDigest: result.digest,
      });

      return openPositionPayload.positionId;
    } catch (error) {
      logger.error('Add liquidity failed', { error: error.message });
      throw error;
    }
  }

  async burnLPTokens(poolAddress, coinType) {
    logger.info('🔥 Burning LP tokens (permanent lock)', { poolAddress });

    try {
      // Get all positions for this pool
      const positions = await this.getPositionsForPool(poolAddress);

      if (positions.length === 0) {
        logger.warn('No positions found to burn');
        return;
      }

      // Burn each position using Cetus Burn Manager
      // This permanently locks liquidity but ALLOWS fee collection!
      for (const position of positions) {
        const burnTx = await this.burnManager.createBurnTransaction({
          positionId: position.id,
          recipient: this.botAddress, // Who can claim fees
        });

        const result = await this.client.signAndExecuteTransaction({
          signer: this.keypair,
          transaction: burnTx,
          options: {
            showEffects: true,
          },
        });

        if (result.effects?.status?.status === 'success') {
          logger.info('✅ LP position burned!', {
            positionId: position.id,
            txDigest: result.digest,
            note: 'Liquidity locked forever, but can still claim 1% trading fees!',
          });
        } else {
          logger.error('Burn failed', {
            positionId: position.id,
            error: result.effects?.status?.error,
          });
        }
      }
      
      logger.info('🎉 Pool complete! Liquidity burned + 1% fees claimable');
    } catch (error) {
      logger.error('LP burn failed', { error: error.message });
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

  priceToSqrtPrice(price) {
    const Q64 = 2n ** 64n;
    const sqrtPrice = Math.sqrt(price);
    return BigInt(Math.floor(sqrtPrice * Number(Q64)));
  }

  extractPoolAddress(txResult) {
    // Extract from object changes
    const poolObject = txResult.objectChanges?.find(
      (change) => change.type === 'created' && change.objectType?.includes('Pool')
    );
    return poolObject?.objectId;
  }

  async getSuiBalanceFromResult(result) {
    // Get balance changes from transaction
    const balanceChanges = result.balanceChanges || [];
    const suiChange = balanceChanges.find(c => c.coinType.includes('SUI'));
    return BigInt(suiChange?.amount || '0');
  }

  async getTokenBalanceFromResult(result, coinType) {
    const balanceChanges = result.balanceChanges || [];
    const tokenChange = balanceChanges.find(c => c.coinType === coinType);
    return BigInt(tokenChange?.amount || '0');
  }

  async getCoinObjects(coinType) {
    const coins = await this.client.getCoins({
      owner: this.botAddress,
      coinType,
    });
    return coins.data.map(c => c.coinObjectId);
  }

  async getPositionsForPool(poolAddress) {
    // Query positions owned by bot for this pool
    const positions = await this.cetusSDK.Position.getPositionList({
      poolAddress,
      ownerAddress: this.botAddress,
    });
    return positions;
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
