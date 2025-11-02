/**
 * Referral system utilities
 * Handles capturing and storing referral codes from URL
 */

const REFERRAL_KEY = 'suilfg_referrer';

/**
 * Get referrer address from URL or localStorage
 */
export function getReferrerAddress(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Check URL first
  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get('ref');
  
  if (refFromUrl && refFromUrl.startsWith('0x')) {
    // Valid referrer in URL - save to localStorage
    localStorage.setItem(REFERRAL_KEY, refFromUrl);
    return refFromUrl;
  }
  
  // Check localStorage
  const stored = localStorage.getItem(REFERRAL_KEY);
  if (stored && stored.startsWith('0x')) {
    return stored;
  }
  
  return null;
}

/**
 * Clear stored referrer (e.g., after successful referral registration)
 */
export function clearReferrer(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFERRAL_KEY);
  }
}

/**
 * Check if user came from a referral link
 */
export function hasReferrer(): boolean {
  return getReferrerAddress() !== null;
}
