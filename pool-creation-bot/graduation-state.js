/**
 * Persistent state manager for graduation processing
 * Tracks partial completions so bot can resume after crashes/restarts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_FILE = path.join(__dirname, 'graduation-state.json');

export class GraduationState {
  constructor() {
    this.state = {
      // Map of curveId -> graduation state
      graduations: {},
      // Last processed event cursor
      lastProcessedTime: Date.now(),
    };
  }

  async load() {
    try {
      const data = await fs.readFile(STATE_FILE, 'utf8');
      this.state = JSON.parse(data);
      console.log(`📂 Loaded state for ${Object.keys(this.state.graduations).length} graduation(s)`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📂 No existing state file, starting fresh');
      } else {
        console.error('Failed to load state:', error.message);
      }
    }
  }

  async save() {
    try {
      await fs.writeFile(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save state:', error.message);
    }
  }

  /**
   * Start tracking a graduation
   */
  startGraduation(curveId, coinType, event) {
    this.state.graduations[curveId] = {
      curveId,
      coinType,
      event,
      status: 'detected',
      startedAt: Date.now(),
      updatedAt: Date.now(),
      steps: {
        payouts: false,
        liquidity: false,
        pool: false,
        burn: false,
      },
      coins: null, // Will store {suiCoinId, suiAmount, tokenAmount}
      poolAddress: null,
      error: null,
    };
    this.save();
  }

  /**
   * Mark payouts as complete
   */
  markPayoutsComplete(curveId) {
    if (this.state.graduations[curveId]) {
      this.state.graduations[curveId].steps.payouts = true;
      this.state.graduations[curveId].updatedAt = Date.now();
      this.save();
    }
  }

  /**
   * Mark liquidity preparation complete and store coin IDs
   * CRITICAL: This is what allows recovery after crashes
   */
  markLiquidityComplete(curveId, coins) {
    if (this.state.graduations[curveId]) {
      this.state.graduations[curveId].steps.liquidity = true;
      this.state.graduations[curveId].coins = {
        suiCoinId: coins.suiCoinId,
        // Store as string for JSON safety
        suiAmount: coins.suiAmount.toString(),
        tokenAmount: coins.tokenAmount.toString(),
      };
      this.state.graduations[curveId].updatedAt = Date.now();
      this.save();
    }
  }

  /**
   * Mark pool creation complete
   */
  markPoolComplete(curveId, poolAddress) {
    if (this.state.graduations[curveId]) {
      this.state.graduations[curveId].steps.pool = true;
      this.state.graduations[curveId].poolAddress = poolAddress;
      this.state.graduations[curveId].updatedAt = Date.now();
      this.save();
    }
  }

  /**
   * Mark LP burn complete
   */
  markBurnComplete(curveId) {
    if (this.state.graduations[curveId]) {
      this.state.graduations[curveId].steps.burn = true;
      this.state.graduations[curveId].status = 'completed';
      this.state.graduations[curveId].completedAt = Date.now();
      this.state.graduations[curveId].updatedAt = Date.now();
      this.save();
    }
  }

  /**
   * Mark graduation as failed
   */
  markFailed(curveId, error) {
    if (this.state.graduations[curveId]) {
      this.state.graduations[curveId].status = 'failed';
      this.state.graduations[curveId].error = error;
      this.state.graduations[curveId].updatedAt = Date.now();
      this.save();
    }
  }

  /**
   * Remove completed graduation from state (cleanup)
   */
  removeCompleted(curveId) {
    if (this.state.graduations[curveId]?.status === 'completed') {
      delete this.state.graduations[curveId];
      this.save();
    }
  }

  /**
   * Get all incomplete graduations that need recovery
   */
  getIncomplete() {
    return Object.values(this.state.graduations).filter(
      g => g.status !== 'completed' && g.status !== 'failed'
    );
  }

  /**
   * Get specific graduation state
   */
  get(curveId) {
    return this.state.graduations[curveId];
  }

  /**
   * Check if we're already tracking this graduation
   */
  has(curveId) {
    return !!this.state.graduations[curveId];
  }

  /**
   * Clean up old completed/failed graduations (older than 7 days)
   */
  async cleanup() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [curveId, grad] of Object.entries(this.state.graduations)) {
      if ((grad.status === 'completed' || grad.status === 'failed') && 
          grad.updatedAt < sevenDaysAgo) {
        delete this.state.graduations[curveId];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old graduation(s)`);
      await this.save();
    }
  }
}

export default GraduationState;
