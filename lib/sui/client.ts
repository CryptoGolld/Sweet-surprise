/**
 * Sui blockchain client utilities
 */

import { SuiClient } from '@mysten/sui/client';
import { NETWORK, RPC_ENDPOINTS } from '../constants';

let client: SuiClient | null = null;

export function getSuiClient(): SuiClient {
  if (!client) {
    client = new SuiClient({ url: RPC_ENDPOINTS.TESTNET });
  }
  return client;
}

/**
 * Format amount from smallest units to human readable
 */
export function formatAmount(amount: string | bigint | number, decimals: number = 9): string {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  
  if (fraction === 0n) {
    return whole.toLocaleString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toLocaleString()}.${fractionStr}`;
}

/**
 * Parse human readable amount to smallest units
 */
export function parseAmount(amount: string, decimals: number = 9): string {
  const [whole = '0', fraction = ''] = amount.split('.');
  const fractionPadded = fraction.padEnd(decimals, '0').slice(0, decimals);
  const value = BigInt(whole) * BigInt(10 ** decimals) + BigInt(fractionPadded || '0');
  return value.toString();
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (!address || address.length < start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Get explorer link
 */
export function getExplorerLink(
  id: string,
  type: 'address' | 'object' | 'txblock' = 'txblock'
): string {
  return `https://suiscan.xyz/${NETWORK}/${type}/${id}`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(current: number | bigint | string, max: number | bigint | string): number {
  const curr = typeof current === 'bigint' ? Number(current) : Number(current);
  const maximum = typeof max === 'bigint' ? Number(max) : Number(max);
  return Math.min(100, (curr / maximum) * 100);
}

/**
 * Format time ago
 */
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
