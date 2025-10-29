#!/usr/bin/env node

/**
 * Fee Collector Script
 * 
 * Periodically claims accumulated trading fees from locked LP positions
 * and sends them to the platform treasury
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

const CONFIG = {
  rpcUrl: process.env.RPC_URL || 'https://fullnode.testnet.sui.io:443',
  lpLockerAddress: process.env.LP_LOCKER_ADDRESS,
  platformTreasury: process.env.PLATFORM_TREASURY,
  collectionInterval: parseInt(process.env.FEE_COLLECTION_INTERVAL_MS || '86400000'), // 24 hours
  gasBudget: parseInt(process.env.GAS_BUDGET || '100000000'),
};

class FeeCollector {
  constructor() {
    this.client = new SuiClient({ url: CONFIG.rpcUrl });
    this.initializeKeypair();
    this.initializeCetusSDK();
  }

  initializeKeypair() {
    const privateKey = process.env.LP_LOCKER_PRIVATE_KEY;
    const seedPhrase = process.env.LP_LOCKER_SEED_PHRASE;
    
    if (!privateKey && !seedPhrase) {
      throw new Error('Either LP_LOCKER_PRIVATE_KEY or LP_LOCKER_SEED_PHRASE must be set');
    }

    if (seedPhrase) {
      logger.info('Initializing from seed phrase');
      this.keypair = Ed25519Keypair.deriveKeypair(seedPhrase);
    } else {
      logger.info('Initializing from private key');
      const keyHex = privateKey.replace(/^suiprivkey/, '');
      this.keypair = Ed25519Keypair.fromSecretKey(fromHEX(keyHex));
    }

    this.address = this.keypair.getPublicKey().toSuiAddress();

    logger.info('Fee Collector initialized', { address: this.address });
  }

  async initializeCetusSDK() {
    const sdkOptions = {
      fullRpcUrl: CONFIG.rpcUrl,
      simulationAccount: {
        address: this.address,
      },
    };

    this.cetusSDK = new CetusClmmSDK(sdkOptions);
    logger.info('Cetus SDK initialized');
  }

  async start() {
    logger.info('💰 Fee Collector Started', {
      collectionInterval: CONFIG.collectionInterval / 1000 / 60,
      unit: 'minutes',
    });

    while (true) {
      try {
        await this.collectAllFees();
        await this.sleep(CONFIG.collectionInterval);
      } catch (error) {
        logger.error('Error in collection loop', { error: error.message });
        await this.sleep(CONFIG.collectionInterval);
      }
    }
  }

  async collectAllFees() {
    logger.info('🔍 Checking for claimable fees...');

    try {
      // Get all positions owned by LP locker
      const positions = await this.getAllPositions();

      if (positions.length === 0) {
        logger.info('No positions found');
        return;
      }

      logger.info(`Found ${positions.length} positions`);

      for (const position of positions) {
        await this.collectFeesFromPosition(position);
      }
    } catch (error) {
      logger.error('Fee collection failed', { error: error.message });
    }
  }

  async collectFeesFromPosition(position) {
    try {
      // Get unclaimed fees
      const fees = await this.cetusSDK.Position.getPositionFees(position.id);

      const feeAmountA = BigInt(fees.feeAmountA || '0');
      const feeAmountB = BigInt(fees.feeAmountB || '0');

      if (feeAmountA === 0n && feeAmountB === 0n) {
        logger.debug('No fees to claim', { positionId: position.id });
        return;
      }

      logger.info('💰 Claiming fees', {
        positionId: position.id,
        feeAmountA: feeAmountA.toString(),
        feeAmountB: feeAmountB.toString(),
      });

      // Create transaction to collect fees
      const tx = new Transaction();

      // Collect fees using Cetus SDK
      const collectPayload = await this.cetusSDK.Position.collectFeeTransactionPayload({
        positionId: position.id,
      });

      // Add transfer to treasury
      if (CONFIG.platformTreasury) {
        // Transfer collected fees to platform treasury
        // (Cetus automatically sends fees to position owner, which is LP locker)
        // We then forward them to treasury
        tx.transferObjects(
          [tx.object(fees.coinAId), tx.object(fees.coinBId)],
          CONFIG.platformTreasury
        );
      }

      tx.setGasBudget(CONFIG.gasBudget);

      const result = await this.client.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: collectPayload,
        options: {
          showEffects: true,
          showBalanceChanges: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        logger.info('✅ Fees collected!', {
          positionId: position.id,
          txDigest: result.digest,
          feeAmountA: feeAmountA.toString(),
          feeAmountB: feeAmountB.toString(),
        });
      }
    } catch (error) {
      logger.error('Failed to collect fees from position', {
        positionId: position.id,
        error: error.message,
      });
    }
  }

  async getAllPositions() {
    // Get all position NFTs owned by LP locker
    const objects = await this.client.getOwnedObjects({
      owner: this.address,
      filter: {
        StructType: `${process.env.CETUS_PACKAGE}::position::Position`,
      },
      options: {
        showContent: true,
      },
    });

    return objects.data.map(obj => ({
      id: obj.data.objectId,
      content: obj.data.content,
    }));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start fee collector
const collector = new FeeCollector();
collector.start().catch((error) => {
  logger.error('Fatal error', { error: error.message });
  process.exit(1);
});
