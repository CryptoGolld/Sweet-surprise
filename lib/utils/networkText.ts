/**
 * Network-specific text helpers
 * Returns appropriate text based on testnet/mainnet
 */

import { NETWORK } from '../constants';

export function getPaymentTokenName(): string {
  return NETWORK === 'mainnet' ? 'SUI' : 'SUILFG_MEMEFI';
}

export function getPaymentTokenSymbol(): string {
  return NETWORK === 'mainnet' ? 'SUI' : 'SUILFG';
}

export function getPlatformName(): string {
  return NETWORK === 'mainnet' ? 'SuiLFG' : 'SuiLFG MemeFi';
}

export function getFaucetInstructions(): string {
  return NETWORK === 'mainnet' 
    ? 'Fund your wallet with SUI to start trading'
    : 'Claim free SUILFG_MEMEFI tokens from the faucet';
}
