#!/usr/bin/env node

/**
 * SuiLFG Pool Creation Bot
 * 
 * Automatically creates Cetus pools and burns LP for graduated tokens
 * 
 * Flow:
 * 1. Monitor blockchain for graduation events
 * 2. Call prepare_pool_liquidity() to extract liquidity
 * 3. Create Cetus pool using Cetus SDK
 * 4. Add liquidity to pool
 * 5. Burn LP tokens using Cetus Burn Manager (permanent lock)
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';
import { CetusClmmSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { CetusBurnSDK } from '@cetusprotocol/cetus-burn-sdk';
import dotenv from 'dotenv';
import { createLogger } from './logger.js';
import { GraduationState } from './graduation-state.js';

dotenv.config();

const logger = createLogger();
const graduationState = new GraduationState();

// Configuration
const CONFIG = {
  network: process.env.NETWORK || 'testnet',
  rpcUrl: process.env.RPC_URL || 'https://fullnode.testnet.sui.io:443',
  platformPackage: process.env.PLATFORM_PACKAGE,
  platformState: process.env.PLATFORM_STATE,
  v1PlatformPackage: process.env.V1_PLATFORM_PACKAGE, // For processing old graduations
  cetusGlobalConfig: process.env.CETUS_GLOBAL_CONFIG,
  cetusPools: process.env.CETUS_POOLS,
  tickSpacing: parseInt(process.env.TICK_SPACING || '200'), // 1% fee tier
  pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '10000'),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  gasBudget: parseInt(process.env.GAS_BUDGET || '100000000'),
  maxConcurrentPools: parseInt(process.env.MAX_CONCURRENT_POOLS || '10'),
};

// State tracking
let processedGraduations = new Set();
let failedGraduations = new Map(); // curveId -> { attempts, lastError, event }
let lastCheckedCursor = null;

class PoolCreationBot {
  constructor() {
    this.client = new SuiClient({ url: CONFIG.rpcUrl });
    this.initializeKeypair();
    this.initializeCetusSDK();
    this.initializeBurnSDK();
  }

  initializeKeypair() {
    const privateKey = process.env.BOT_PRIVATE_KEY;
    const seedPhrase = process.env.BOT_SEED_PHRASE;
    
    if (!privateKey && !seedPhrase) {
      throw new Error('Either BOT_PRIVATE_KEY or BOT_SEED_PHRASE must be set in environment');
    }

    if (seedPhrase) {
      // Use seed phrase (mnemonic)
      logger.info('Initializing from seed phrase');
      this.keypair = Ed25519Keypair.deriveKeypair(seedPhrase);
    } else {
      // Use private key
      logger.info('Initializing from private key');
      const keyHex = privateKey.replace(/^suiprivkey/, '');
      this.keypair = Ed25519Keypair.fromSecretKey(fromHEX(keyHex));
    }

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
        clmm_pool: {
          package_id: '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12',
          published_at: '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12',
          config: {
            global_config_id: CONFIG.cetusGlobalConfig,
            pools_id: CONFIG.cetusPools,
          },
        },
        integrate: {
          package_id: '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12',
          published_at: '0x0c7ae833c220aa73a3643a0d508afa4ac5d50d97312ea4584e35f9eb21b9df12',
        },
      };

      this.cetusSDK = new CetusClmmSDK(sdkOptions);
      this.cetusSDK.senderAddress = this.botAddress; // Required in SDK v5+
      logger.info('Cetus SDK initialized');
      logger.info('Pool configuration: 1% fee tier (tick spacing 200)');
    } catch (error) {
      logger.error('Failed to initialize Cetus SDK', { error: error.message });
      throw error;
    }
  }

  initializeBurnSDK() {
    try {
      this.burnSDK = new CetusBurnSDK({
        network: CONFIG.network === 'mainnet' ? 'mainnet' : 'testnet',
        fullNodeUrl: CONFIG.rpcUrl,
      });
      
      logger.info('Cetus Burn SDK initialized');
      logger.info('🔥 LP will be burned but fees can still be claimed!');
    } catch (error) {
      logger.error('Failed to initialize Cetus Burn SDK', { error: error.message });
      throw error;
    }
  }


  /**
   * Resume a partially completed graduation after bot restart
   * This uses stored coin IDs to avoid extracting from contract again
   */
  async resumeGraduation(grad) {
    const { curveId, coinType, steps, coins, poolAddress } = grad;
    
    try {
      // Check if curve was already completed by someone/something else
      const curveState = await this.getCurveState(curveId, coinType);
      if (curveState.lp_seeded && !coins) {
        logger.warn('⚠️  Curve was seeded but we have no coins - may have been done externally', {
          curveId,
        });
        graduationState.markFailed(curveId, 'Seeded externally without our tracking');
        return;
      }
      
      // If liquidity was prepared, we have coin IDs to work with
      if (steps.liquidity && coins) {
        const suiCoinId = coins.suiCoinId;
        const suiAmount = BigInt(coins.suiAmount);
        const tokenAmount = BigInt(coins.tokenAmount);
        
        logger.info('🔄 Resuming with tracked coins', {
          curveId,
          suiCoinId,
          suiAmount: suiAmount.toString(),
          tokenAmount: tokenAmount.toString(),
        });
        
        // Resume from pool creation if not done
        let currentPoolAddress = poolAddress;
        if (!steps.pool) {
          logger.info('📦 Creating pool (resumed)...', { curveId });
          currentPoolAddress = await this.createCetusPool(coinType, suiAmount, tokenAmount, suiCoinId);
          graduationState.markPoolComplete(curveId, currentPoolAddress);
        } else {
          logger.info('✅ Pool already created', { poolAddress: currentPoolAddress });
        }
        
        // Resume from burn if not done
        if (!steps.burn) {
          logger.info('🔥 Burning LP (resumed)...', { curveId });
          await this.burnLPTokens(currentPoolAddress, coinType, suiCoinId);
          graduationState.markBurnComplete(curveId);
        } else {
          logger.info('✅ LP already burned');
        }
        
        logger.info('✅ Resumed graduation complete!', { curveId, poolAddress: currentPoolAddress });
        
        // Report to indexer
        await this.reportPoolToIndexer(coinType, currentPoolAddress);
        
        // Clean up
        graduationState.removeCompleted(curveId);
      } else {
        // No coins tracked - can't resume, need to start fresh
        logger.warn('⚠️  No coins tracked for this graduation - will restart from scratch', {
          curveId,
        });
        
        // Mark as failed so it doesn't retry endlessly
        graduationState.markFailed(curveId, 'No coins tracked, cannot resume');
      }
    } catch (error) {
      logger.error('Failed to resume graduation', {
        curveId,
        error: error.message,
        stack: error.stack,
      });
      
      graduationState.markFailed(curveId, error.message);
    }
  }

  async start() {
    logger.info('🤖 Pool Creation Bot Started', {
      network: CONFIG.network,
      pollingInterval: CONFIG.pollingInterval,
    });

    // Load persistent state
    await graduationState.load();
    
    // Resume incomplete graduations from previous session
    const incomplete = graduationState.getIncomplete();
    if (incomplete.length > 0) {
      logger.info('🔄 Resuming incomplete graduations from previous session', {
        count: incomplete.length,
      });
      
      for (const grad of incomplete) {
        logger.info('Resuming graduation', {
          curveId: grad.curveId,
          coinType: grad.coinType,
          steps: grad.steps,
        });
        
        // Resume from where we left off
        await this.resumeGraduation(grad);
      }
    }
    
    // Clean up old state
    await graduationState.cleanup();

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
      // Query graduation events from BOTH V1 and V2 packages
      // V1 package: graduations that happened before upgrade
      // V2 package: current upgraded version
      const queries = [];
      
      // Add V1 queries if V1 package is configured
      if (CONFIG.v1PlatformPackage) {
        queries.push(
          this.client.queryEvents({
            query: { MoveEventType: `${CONFIG.v1PlatformPackage}::bonding_curve::Graduated` },
            limit: 25,
            order: 'descending',
          }),
          this.client.queryEvents({
            query: { MoveEventType: `${CONFIG.v1PlatformPackage}::bonding_curve::GraduationReady` },
            limit: 25,
            order: 'descending',
          })
        );
      }
      
      // Add V2 queries
      queries.push(
        this.client.queryEvents({
          query: { MoveEventType: `${CONFIG.platformPackage}::bonding_curve::Graduated` },
          limit: 25,
          order: 'descending',
        }),
        this.client.queryEvents({
          query: { MoveEventType: `${CONFIG.platformPackage}::bonding_curve::GraduationReady` },
          limit: 25,
          order: 'descending',
        })
      );
      
      const results = await Promise.all(queries);

      // Combine all event types from all packages
      const allEvents = results.flatMap(result => result.data);
      
      if (allEvents.length > 0) {
        // Sort by timestamp descending (newest first)
        allEvents.sort((a, b) => parseInt(b.timestampMs) - parseInt(a.timestampMs));
        
        // Filter only new events
        const newEvents = allEvents.filter(event => 
          !processedGraduations.has(event.id.txDigest)
        ).reverse();

        if (newEvents.length > 0) {
          logger.info(`📊 Found ${newEvents.length} new graduation(s) to process`);
        }

        // Process graduations ONE AT A TIME to avoid race conditions
        logger.info(`Processing ${newEvents.length} graduation(s) sequentially...`);
        
        for (let i = 0; i < newEvents.length; i++) {
          const event = newEvents[i];
          logger.info(`Processing graduation ${i + 1}/${newEvents.length}`);
          
          try {
            await this.handleGraduation(event);
            logger.info(`✅ Graduation ${i + 1}/${newEvents.length} complete`);
          } catch (error) {
            logger.error(`❌ Graduation ${i + 1}/${newEvents.length} failed`, {
              txDigest: event.id.txDigest,
              error: error.message,
            });
            // Continue with next graduation
          }
        }

        // Mark all as processed
        newEvents.forEach(event => {
          processedGraduations.add(event.id.txDigest);
        });
      }
    } catch (error) {
      logger.error('Error checking graduations', { error: error.message });
    }
  }

  async handleGraduation(event, retryData = null) {
    // Can be either "Graduated" (auto) or "GraduationReady" (manual) event
    const txDigest = event.id.txDigest;
    const eventType = event.type.includes('Graduated') ? 'Graduated' : 'GraduationReady';
    
    // Detect which package version this graduation came from
    const isV1Graduation = event.packageId === CONFIG.v1PlatformPackage;
    
    logger.info(`Detected ${eventType} event`, { 
      txDigest: txDigest.slice(0, 16) + '...',
      eventPackage: isV1Graduation ? 'V1' : 'V2',
      note: isV1Graduation ? 'Will process using V2 functions (upgrade compatible)' : 'Native V2'
    });
    
    // Get the transaction to find curve_id and coin_type
    const tx = await this.client.getTransactionBlock({
      digest: txDigest,
      options: { showInput: true, showObjectChanges: true, showEvents: true },
    });
    
    // Extract curve_id from transaction - it's the BondingCurve object that was mutated
    const curveObject = tx.objectChanges?.find(change => 
      change.type === 'mutated' && 
      change.objectType?.includes('BondingCurve')
    );
    
    const curveId = curveObject?.objectId;
    
    // Extract coin type from the BondingCurve object type parameter
    const coinType = curveObject?.objectType?.match(/BondingCurve<(.+)>/)?.[1];

    if (!curveId || !coinType) {
      logger.error('Could not extract curve_id or coin_type from graduation event', { 
        eventType,
        event, 
        curveObject,
        objectChanges: tx.objectChanges 
      });
      return;
    }

    logger.info('Processing graduation', { curveId, coinType, isRetry: !!retryData });

    // Start tracking this graduation if not already tracked
    if (!graduationState.has(curveId)) {
      graduationState.startGraduation(curveId, coinType, event);
    }

    // Check curve state before processing
    const curveState = await this.getCurveState(curveId, coinType);
    
    if (curveState.lp_seeded) {
      logger.warn('⚠️  LP already seeded for this curve - skipping', { curveId });
      return;
    }
    
    if (!curveState.graduated) {
      logger.warn('⚠️  Curve not yet graduated - skipping', { curveId });
      return;
    }

    logger.info('Curve state', {
      curveId,
      graduated: curveState.graduated,
      lp_seeded: curveState.lp_seeded,
      reward_paid: curveState.reward_paid,
      sui_reserve_mist: curveState.sui_reserve,
      sui_reserve_sui: (BigInt(curveState.sui_reserve) / BigInt(1_000_000_000)).toString(),
    });
    
    // Sanity check: ensure reserve has meaningful balance for LP
    // After payouts, should have ~11,999.7 SUI (rounding from 13,333 - 10%)
    const minSafeBalance = BigInt(10_000_000_000_000); // 10,000 SUI minimum
    const currentBalance = BigInt(curveState.sui_reserve);
    
    if (currentBalance < minSafeBalance) {
      logger.error('⚠️  Insufficient balance in curve reserve!', {
        curveId,
        minRequired: '10,000 SUI',
        current: (currentBalance / BigInt(1_000_000_000)).toString() + ' SUI',
        note: 'Reserve too low - may have been drained or never graduated properly.',
      });
      return; // Skip this graduation
    }
    
    // Log if balance is slightly lower than ideal (but still processable)
    const idealBalance = BigInt(11_999_000_000_000); // ~11,999 SUI
    if (currentBalance < idealBalance) {
      logger.warn('💡 Balance slightly lower than ideal', {
        curveId,
        expected: '~12,000 SUI',
        actual: (currentBalance / BigInt(1_000_000_000)).toString() + ' SUI',
        note: 'Contract will use actual balance - this is normal due to rounding.',
      });
    }

    // Retry logic with exponential backoff
    const maxRetries = CONFIG.maxRetries || 3;
    let lastError = null;
    let suiCoinId, suiAmount, tokenAmount;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attempt ${attempt}/${maxRetries}`, { curveId });

        // Check if LP was already seeded (in case previous attempt succeeded but we didn't realize)
        const freshState = await this.getCurveState(curveId, coinType);
        if (freshState.lp_seeded) {
          logger.info('✅ LP already seeded (previous attempt succeeded)', { curveId });
          return; // Success! No need to retry
        }

        // Step 0: Distribute payouts first (only if not already paid)
        if (!freshState.reward_paid) {
          await this.distributePayouts(curveId, coinType);
          graduationState.markPayoutsComplete(curveId);
        } else {
          logger.info('Payouts already distributed, skipping');
          graduationState.markPayoutsComplete(curveId);
        }
        
        // Step 1: Prepare liquidity
        // If this is a retry and we already have the coins, reuse them
        if (retryData?.suiCoinId) {
          logger.info('♻️ Reusing previously extracted SUI/tokens', { 
            curveId,
            suiCoinId: retryData.suiCoinId,
            note: 'Not extracting from curve again'
          });
          suiCoinId = retryData.suiCoinId;
          // Convert back to BigInt from stored string
          suiAmount = BigInt(retryData.suiAmount);
          tokenAmount = BigInt(retryData.tokenAmount);
        } else {
          // First attempt - extract from curve
          // Always use V2 functions even for V1 graduations (upgrade compatible)
          const prepared = await this.prepareLiquidity(curveId, coinType);
          suiCoinId = prepared.suiCoinId;
          suiAmount = prepared.suiAmount;
          tokenAmount = prepared.tokenAmount;
          
          // Store in persistent state for crash recovery
          graduationState.markLiquidityComplete(curveId, prepared);
          
          // Also store in memory for immediate retry (convert BigInt to string for JSON safety)
          if (failedGraduations.has(curveId)) {
            const existing = failedGraduations.get(curveId);
            failedGraduations.set(curveId, {
              ...existing,
              suiCoinId,
              suiAmount: suiAmount.toString(),
              tokenAmount: tokenAmount.toString(),
            });
          }
        }

        // Step 2: Create Cetus pool (1% fee tier) - uses SUI from curve for gas
        const poolAddress = await this.createCetusPool(coinType, suiAmount, tokenAmount, suiCoinId);
        graduationState.markPoolComplete(curveId, poolAddress);

        // Step 3: Burn LP tokens (permanent lock, but can still claim fees!)
        await this.burnLPTokens(poolAddress, coinType, suiCoinId);
        graduationState.markBurnComplete(curveId);

        logger.info('✅ Pool creation complete!', {
          curveId,
          poolAddress,
          status: 'success',
          attempt,
        });

        // Remove from failed graduations if it was there
        if (failedGraduations.has(curveId)) {
          failedGraduations.delete(curveId);
          logger.info('✅ Previously failed graduation now succeeded', { curveId });
        }

        // Report pool address to indexer
        await this.reportPoolToIndexer(coinType, poolAddress);

        return; // Success! Exit retry loop
      } catch (error) {
        lastError = error;
        logger.error(`Attempt ${attempt}/${maxRetries} failed`, {
          curveId,
          error: error.message,
          stack: error.stack,
        });

        // If not last attempt, wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          logger.info(`Retrying in ${backoffMs}ms...`, { curveId });
          await this.sleep(backoffMs);
        }
      }
    }

    // All retries failed - store for later retry
    logger.error('❌ All retries exhausted', {
      curveId,
      attempts: maxRetries,
      finalError: lastError?.message,
    });

    // Store failed graduation for retry later
    const currentAttempts = failedGraduations.get(curveId)?.attempts || 0;
    
    // IMPORTANT: Store which SUI/tokens belong to this pool
    // This prevents mixing up SUI from different graduations
    const failedData = {
      attempts: currentAttempts + 1,
      lastError: lastError?.message,
      lastAttempt: Date.now(),
      event,
      coinType,
      // These will be set if prepareLiquidity succeeded
      suiCoinId: null,
      suiAmount: null,
      tokenAmount: null,
    };
    
    failedGraduations.set(curveId, failedData);

    logger.warn('⚠️ Stored failed graduation for later retry', {
      curveId,
      coinType,
      totalAttempts: currentAttempts + 1,
      nextRetryIn: '10 minutes',
      note: 'Will retry with same coins to avoid mixing pools',
    });
  }

  async getCurveState(curveId, coinType) {
    try {
      const curve = await this.client.getObject({
        id: curveId,
        options: { showContent: true },
      });

      if (curve.data?.content?.dataType === 'moveObject') {
        const fields = curve.data.content.fields;
        
        // Extract reserve balance - Balance<T> structure
        let reserveBalance = '0';
        
        // Log raw structure for debugging
        logger.debug('Raw sui_reserve structure:', {
          curveId,
          sui_reserve: JSON.stringify(fields.sui_reserve),
          sui_reserve_type: typeof fields.sui_reserve,
        });
        
        // Balance<T> on Sui is typically a string number directly
        if (fields.sui_reserve) {
          if (typeof fields.sui_reserve === 'string') {
            reserveBalance = fields.sui_reserve;
          } else if (typeof fields.sui_reserve === 'number') {
            reserveBalance = fields.sui_reserve.toString();
          } else if (typeof fields.sui_reserve === 'object') {
            // Could be nested as {fields: {value: "..."}} or just the value
            reserveBalance = fields.sui_reserve.value || 
                           fields.sui_reserve.fields?.value || 
                           fields.sui_reserve.toString();
          }
        }
        
        logger.debug('Extracted balance:', {
          curveId,
          reserveBalance,
          reserveBalanceType: typeof reserveBalance,
        });
        
        return {
          graduated: fields.graduated || false,
          lp_seeded: fields.lp_seeded || false,
          reward_paid: fields.reward_paid || false,
          sui_reserve: reserveBalance,
        };
      }

      return { graduated: false, lp_seeded: false, reward_paid: false, sui_reserve: '0' };
    } catch (error) {
      logger.error('Failed to get curve state', { curveId, error: error.message });
      return { graduated: false, lp_seeded: false, reward_paid: false, sui_reserve: '0' };
    }
  }

  async distributePayouts(curveId, coinType) {
    logger.info('💰 Distributing payouts', { curveId });

    const tx = new Transaction();

    // Call distribute_payouts first (required before prepare_pool_liquidity)
    tx.moveCall({
      target: `${CONFIG.platformPackage}::bonding_curve::distribute_payouts`,
      typeArguments: [coinType],
      arguments: [
        tx.object(CONFIG.platformState),
        tx.object(curveId),
      ],
    });

    tx.setGasBudget(CONFIG.gasBudget);

    const result = await this.executeTransaction(tx);

    logger.info('✅ Payouts distributed', {
      txDigest: result.digest,
      note: 'Platform cut + creator reward sent',
    });
  }

  async prepareLiquidity(curveId, coinType) {
    logger.info('📦 Preparing liquidity', { curveId });

    const tx = new Transaction();

    // prepare_pool_liquidity transfers coins directly to bot address (no return values)
    logger.info(`Calling prepare_pool_liquidity on V2 package...`);

    tx.moveCall({
      target: `${CONFIG.platformPackage}::bonding_curve::prepare_pool_liquidity`,
      typeArguments: [coinType],
      arguments: [
        tx.object(CONFIG.platformState),
        tx.object(curveId),
      ],
    });

    tx.setGasBudget(CONFIG.gasBudget);

    const result = await this.executeTransaction(tx);

    logger.info('✅ prepare_pool_liquidity executed', {
      txDigest: result.digest,
      note: 'Coins transferred to bot wallet, querying...',
    });

    // Wait a moment for the transaction to be indexed
    await this.sleep(2000);

    // Query bot wallet for the coins that were just transferred
    const paymentCoinType = '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::suilfg_memefi::SUILFG_MEMEFI';
    
    const [suiCoins, tokenCoins] = await Promise.all([
      this.client.getCoins({
        owner: this.botAddress,
        coinType: paymentCoinType,
      }),
      this.client.getCoins({
        owner: this.botAddress,
        coinType: coinType,
      })
    ]);

    // Get the largest coins (should be the ones just transferred)
    const suiCoin = suiCoins.data.sort((a, b) => parseInt(b.balance) - parseInt(a.balance))[0];
    const tokenCoin = tokenCoins.data.sort((a, b) => parseInt(b.balance) - parseInt(a.balance))[0];

    if (!suiCoin || !tokenCoin) {
      throw new Error('Coins not found in bot wallet after prepare_pool_liquidity');
    }

    const suiAmount = BigInt(suiCoin.balance);
    const tokenAmount = BigInt(tokenCoin.balance);
    const suiCoinId = suiCoin.coinObjectId;

    logger.info('✅ Liquidity prepared', {
      suiAmount: suiAmount.toString(),
      tokenAmount: tokenAmount.toString(),
      suiCoinId,
      note: 'Retrieved from bot wallet',
    });

    return { suiAmount, tokenAmount, suiCoinId };
  }

  async createCetusPool(coinType, suiAmount, tokenAmount, suiCoinId) {
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
      sqrtPrice: sqrtPrice.toString(), // Convert BigInt to string for logging
      tickSpacing: CONFIG.tickSpacing,
    });

    try {
      // Create pool using Cetus SDK (note: SDK has typo "creat" not "create")
      const createPoolPayload = await this.cetusSDK.Pool.creatPoolTransactionPayload({
        coinTypeA: coinA,
        coinTypeB: coinB,
        tick_spacing: CONFIG.tickSpacing, // 200 = 1% fee tier - this one IS snake_case
        initialize_sqrt_price: sqrtPrice.toString(), // snake_case
        uri: '',
      });

      // Use SUI from curve for gas payment
      if (suiCoinId) {
        createPoolPayload.setGasPayment([{ objectId: suiCoinId, version: null, digest: null }]);
        logger.info('Using SUI from curve for gas', { suiCoinId });
      }

      logger.info('Creating pool with 1% fees', {
        coinA: coinA.slice(0, 20) + '...',
        coinB: coinB.slice(0, 20) + '...',
        feeTier: '1%',
        tickSpacing: CONFIG.tickSpacing,
        gasPayment: suiCoinId ? 'from curve' : 'from bot wallet',
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

      // Add liquidity (also uses SUI from curve for gas)
      await this.addLiquidity(poolAddress, coinType, suiAmount, tokenAmount, suiCoinId);

      return poolAddress;
    } catch (error) {
      logger.error('Pool creation failed', { error: error.message });
      throw error;
    }
  }

  async addLiquidity(poolAddress, coinType, suiAmount, tokenAmount, suiCoinId) {
    logger.info('💧 Adding liquidity', { poolAddress });

    try {
      // Get pool info with retry
      let pool;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          pool = await this.cetusSDK.Pool.getPool(poolAddress);
          break;
        } catch (error) {
          logger.warn(`SDK getPool attempt ${attempt}/3 failed`, { error: error.message });
          if (attempt === 3) throw error;
          await this.sleep(1000 * attempt);
        }
      }

      // Calculate position range (full range)
      const lowerTick = pool.tickSpacing * Math.floor(-443636 / pool.tickSpacing);
      const upperTick = pool.tickSpacing * Math.floor(443636 / pool.tickSpacing);

      // Open position and add liquidity with retry
      let openPositionPayload;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          openPositionPayload = await this.cetusSDK.Position.openPositionTransactionPayload({
            poolAddress,
            tickLower: lowerTick.toString(),
            tickUpper: upperTick.toString(),
            coinTypeA: pool.coinTypeA,
            coinTypeB: pool.coinTypeB,
          });
          break;
        } catch (error) {
          logger.warn(`SDK openPosition attempt ${attempt}/3 failed`, { error: error.message });
          if (attempt === 3) throw error;
          await this.sleep(1000 * attempt);
        }
      }

      // Get coin objects
      const paymentCoinType = process.env.PAYMENT_COIN_TYPE || '0x2::sui::SUI';
      const [coinAObjects, coinBObjects] = pool.coinTypeA === paymentCoinType
        ? [await this.getCoinObjects(paymentCoinType), await this.getCoinObjects(coinType)]
        : [await this.getCoinObjects(coinType), await this.getCoinObjects(paymentCoinType)];

      // Add liquidity to position with retry
      let addLiquidityPayload;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          addLiquidityPayload = await this.cetusSDK.Position.addLiquidityTransactionPayload({
            poolAddress,
            positionId: openPositionPayload.positionId,
            deltaLiquidity: '1000000', // Will be calculated by SDK
            maxAmountA: suiAmount.toString(),
            maxAmountB: tokenAmount.toString(),
            coinTypeA: pool.coinTypeA,
            coinTypeB: pool.coinTypeB,
          });
          break;
        } catch (error) {
          logger.warn(`SDK addLiquidity attempt ${attempt}/3 failed`, { error: error.message });
          if (attempt === 3) throw error;
          await this.sleep(1000 * attempt);
        }
      }

      // Use SUI from curve for gas
      if (suiCoinId) {
        addLiquidityPayload.setGasPayment([{ objectId: suiCoinId, version: null, digest: null }]);
        logger.info('Using SUI from curve for gas', { suiCoinId });
      }

      logger.info('Adding full-range liquidity', {
        poolAddress,
        lowerTick,
        upperTick,
        gasPayment: suiCoinId ? 'from curve' : 'from bot wallet',
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

  async burnLPTokens(poolAddress, coinType, suiCoinId) {
    logger.info('🔥 Burning LP tokens (permanent lock with fee claiming)', { poolAddress });

    try {
      // Get all positions for this pool with retry
      let positions;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          positions = await this.getPositionsForPool(poolAddress);
          break;
        } catch (error) {
          logger.warn(`SDK getPositions attempt ${attempt}/3 failed`, { error: error.message });
          if (attempt === 3) throw error;
          await this.sleep(1000 * attempt);
        }
      }

      if (positions.length === 0) {
        logger.warn('No positions found to burn');
        return;
      }

      logger.info(`Found ${positions.length} position(s) to burn`);

      // Burn each position using Cetus LP Burn SDK
      for (const position of positions) {
        logger.info('Burning position', { positionId: position.pos_object_id });

        // Create burn transaction with retry
        let burnPayload;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            burnPayload = await this.burnSDK.Burn.createBurnPositionTransactionPayload({
              pool_id: poolAddress,
              position_id: position.pos_object_id,
              collect_fee: true, // Collect any existing fees before burning
            });
            break;
          } catch (error) {
            logger.warn(`SDK burnPosition attempt ${attempt}/3 failed`, { error: error.message });
            if (attempt === 3) throw error;
            await this.sleep(1000 * attempt);
          }
        }

        // Use SUI from curve for gas
        if (suiCoinId) {
          burnPayload.setGasPayment([{ 
            objectId: suiCoinId, 
            version: null, 
            digest: null 
          }]);
          logger.info('Using SUI from curve for gas', { suiCoinId });
        }

        const result = await this.client.signAndExecuteTransaction({
          signer: this.keypair,
          transaction: burnPayload,
          options: {
            showEffects: true,
            showEvents: true,
          },
        });

        if (result.effects?.status?.status === 'success') {
          logger.info('✅ LP position burned!', {
            positionId: position.pos_object_id,
            txDigest: result.digest,
            note: 'Liquidity permanently locked, but can still claim trading fees!',
          });
        } else {
          logger.error('Burn transaction failed', {
            positionId: position.pos_object_id,
            error: result.effects?.status?.error,
          });
        }
      }
      
      logger.info('🎉 Pool complete! All LP burned - liquidity locked forever, fees claimable');
    } catch (error) {
      logger.error('LP burn failed', { 
        error: error.message,
        stack: error.stack 
      });
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

  extractTransferredSuiCoin(result) {
    // Find the SUI coin object that was created/transferred to bot
    const suiObject = result.objectChanges?.find(
      (change) => 
        (change.type === 'created' || change.type === 'mutated') && 
        change.objectType?.includes('0x2::coin::Coin') &&
        change.objectType?.includes('SUI') &&
        change.owner?.AddressOwner === this.botAddress
    );
    
    if (suiObject) {
      logger.info('Found SUI coin for gas payment', { 
        coinId: suiObject.objectId,
        owner: this.botAddress 
      });
      return suiObject.objectId;
    }
    
    logger.warn('Could not find transferred SUI coin, will use bot wallet for gas');
    return null;
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

  async reportPoolToIndexer(coinType, poolAddress) {
    try {
      const indexerApiUrl = process.env.INDEXER_API_URL || 'http://localhost:3002';
      
      const response = await fetch(`${indexerApiUrl}/api/update-pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coinType, poolAddress }),
      });

      if (response.ok) {
        logger.info('✅ Reported pool to indexer', { coinType, poolAddress });
      } else {
        logger.warn('⚠️ Failed to report pool to indexer', { 
          coinType, 
          status: response.status 
        });
      }
    } catch (error) {
      logger.warn('⚠️ Could not report pool to indexer', { 
        error: error.message,
        note: 'Pool created successfully, just indexer notification failed'
      });
    }
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
