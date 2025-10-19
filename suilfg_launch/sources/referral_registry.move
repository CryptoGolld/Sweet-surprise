module suilfg_launch::referral_registry {
    use sui::object::{Self, UID};
    use sui::tx_context::{TxContext, sender};
    use sui::table::{Self, Table};
    use sui::transfer;
    use sui::event;
    use std::option::{Self, Option};
    
    use suilfg_launch::platform_config::AdminCap;
    
    /// Shared referral registry for all tokens
    public struct ReferralRegistry has key {
        id: UID,
        // Core mapping: trader -> referrer
        referrals: Table<address, address>,
        // Stats per referrer
        referrer_stats: Table<address, ReferrerStats>,
    }
    
    /// Stats tracked per referrer
    public struct ReferrerStats has store, copy, drop {
        total_referrals: u64,      // Count of unique users referred
        total_earned_sui: u64,     // Lifetime earnings in SUI (mist)
    }
    
    // === Events ===
    
    public struct ReferralRegistered has copy, drop {
        trader: address,
        referrer: address,
        timestamp: u64,
    }
    
    public struct ReferralRewardPaid has copy, drop {
        referrer: address,
        trader: address,
        amount: u64,          // Reward amount in SUI (mist)
        trade_amount: u64,    // Original trade amount
    }
    
    // === Errors ===
    
    const E_CANNOT_REFER_SELF: u64 = 1;
    const E_ALREADY_HAS_REFERRER: u64 = 2;
    
    // === Init ===
    
    public struct REFERRAL_REGISTRY has drop {}
    
    fun init(_witness: REFERRAL_REGISTRY, ctx: &mut TxContext) {
        let registry = ReferralRegistry {
            id: object::new(ctx),
            referrals: table::new<address, address>(ctx),
            referrer_stats: table::new<address, ReferrerStats>(ctx),
        };
        transfer::share_object(registry);
    }
    
    // === Public Functions ===
    
    /// Try to register referral (idempotent - no-op if already has referrer)
    /// This is called automatically on first trade
    public fun try_register(
        registry: &mut ReferralRegistry,
        trader: address,
        referrer: address,
        timestamp: u64
    ) {
        // Validation: silently skip invalid cases
        if (trader == referrer) { return };  // Can't refer self
        if (has_referrer(registry, trader)) { return };  // Already has referrer
        
        // Register trader -> referrer mapping
        table::add(&mut registry.referrals, trader, referrer);
        
        // Initialize or update referrer stats
        if (!table::contains(&registry.referrer_stats, referrer)) {
            table::add(&mut registry.referrer_stats, referrer, ReferrerStats {
                total_referrals: 1,
                total_earned_sui: 0,
            });
        } else {
            let stats = table::borrow_mut(&mut registry.referrer_stats, referrer);
            stats.total_referrals = stats.total_referrals + 1;
        };
        
        event::emit(ReferralRegistered { trader, referrer, timestamp });
    }
    
    /// Record referral reward payment (updates stats)
    public fun record_reward(
        registry: &mut ReferralRegistry,
        referrer: address,
        amount: u64
    ) {
        if (!table::contains(&registry.referrer_stats, referrer)) {
            return  // Should never happen, but safe
        };
        
        let stats = table::borrow_mut(&mut registry.referrer_stats, referrer);
        stats.total_earned_sui = stats.total_earned_sui + amount;
    }
    
    // === View Functions (No gas cost to query) ===
    
    /// Get referrer for a trader (returns none if no referrer)
    public fun get_referrer(
        registry: &ReferralRegistry,
        trader: address
    ): Option<address> {
        if (table::contains(&registry.referrals, trader)) {
            option::some(*table::borrow(&registry.referrals, trader))
        } else {
            option::none()
        }
    }
    
    /// Check if trader has referrer
    public fun has_referrer(
        registry: &ReferralRegistry,
        trader: address
    ): bool {
        table::contains(&registry.referrals, trader)
    }
    
    /// Get referrer stats (total_referrals, total_earned_sui)
    public fun get_stats(
        registry: &ReferralRegistry,
        referrer: address
    ): (u64, u64) {
        if (table::contains(&registry.referrer_stats, referrer)) {
            let stats = table::borrow(&registry.referrer_stats, referrer);
            (stats.total_referrals, stats.total_earned_sui)
        } else {
            (0, 0)
        }
    }
    
    /// Get total referrals count
    public fun get_total_referrals(
        registry: &ReferralRegistry,
        referrer: address
    ): u64 {
        if (table::contains(&registry.referrer_stats, referrer)) {
            table::borrow(&registry.referrer_stats, referrer).total_referrals
        } else {
            0
        }
    }
    
    /// Get lifetime earnings
    public fun get_lifetime_earnings(
        registry: &ReferralRegistry,
        referrer: address
    ): u64 {
        if (table::contains(&registry.referrer_stats, referrer)) {
            table::borrow(&registry.referrer_stats, referrer).total_earned_sui
        } else {
            0
        }
    }
}
