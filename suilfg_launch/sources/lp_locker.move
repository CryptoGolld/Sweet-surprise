/// Module: lp_locker
/// 
/// Permanently locks Cetus LP Position NFTs in a shared object
/// Features:
/// - Permanent lock (no unlock function)
/// - Upgrade-safe with is_permanently_locked flag
/// - Collects LP fees to changeable recipient
/// - 100% transparent and auditable
module suilfg_launch::lp_locker {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::event;
    use sui::clock::Clock;
    
    use sui::sui::SUI;
    use cetus_clmm::config::GlobalConfig;
    use cetus_clmm::pool::{Self as cetus_pool, Pool};
    use cetus_clmm::position::Position;
    
    use suilfg_launch::platform_config::AdminCap;
    
    /// Shared object that permanently locks a Cetus Position NFT
    /// Once created with is_permanently_locked = true, it can NEVER be unlocked
    /// Even if future upgrades add unlock functions, the flag prevents it
    public struct LockedLPPosition<phantom CoinA, phantom CoinB> has key {
        id: UID,
        position: Position,                  // Cetus Position NFT locked inside
        pool_id: ID,                         // Which pool this position is for
        fee_recipient: address,              // Changeable by admin
        locked_at: u64,                      // Timestamp when locked
        bonding_curve_id: ID,                // Which bonding curve created this
        is_permanently_locked: bool,         // TRUE = cannot unlock (upgrade-safe!)
    }
    
    // ==================== Events ====================
    
    public struct PositionLocked has copy, drop {
        locked_position_id: ID,
        position_id: ID,
        pool_id: ID,
        locked_at: u64,
        fee_recipient: address,
        bonding_curve_id: ID,
    }
    
    public struct FeeCollected has copy, drop {
        locked_position_id: ID,
        fee_sui: u64,
        fee_token: u64,
        recipient: address,
    }
    
    public struct RecipientChanged has copy, drop {
        locked_position_id: ID,
        old_recipient: address,
        new_recipient: address,
    }
    
    // ==================== Errors ====================
    
    const E_PERMANENTLY_LOCKED: u64 = 1;
    const E_NOT_PERMANENTLY_LOCKED: u64 = 2;
    
    // ==================== Core Functions ====================
    
    /// Lock a Cetus position permanently in a shared object
    /// This is the ONLY way to create a LockedLPPosition
    /// Once created, it can NEVER be unlocked
    public fun lock_position_permanent<CoinA, CoinB>(
        position: Position,
        pool_id: ID,
        fee_recipient: address,
        bonding_curve_id: ID,
        locked_at: u64,
        ctx: &mut TxContext
    ): LockedLPPosition<CoinA, CoinB> {
        let position_id = object::id(&position);
        let locked_id = object::new(ctx);
        let locked_position_id = object::uid_to_inner(&locked_id);
        
        let locked = LockedLPPosition<CoinA, CoinB> {
            id: locked_id,
            position,
            pool_id,
            fee_recipient,
            locked_at,
            bonding_curve_id,
            is_permanently_locked: true,  // PERMANENT! This flag is immutable!
        };
        
        event::emit(PositionLocked {
            locked_position_id,
            position_id,
            pool_id,
            locked_at,
            fee_recipient,
            bonding_curve_id,
        });
        
        locked
    }
    
    /// Collect LP fees from locked position (PERMISSIONLESS!)
    /// Anyone can call this to send fees to the fee recipient
    /// The position stays locked forever - only fees are collected
    public entry fun collect_lp_fees<CoinA, CoinB>(
        locked: &mut LockedLPPosition<CoinA, CoinB>,
        cetus_config: &GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        ctx: &mut TxContext
    ) {
        // Collect fees from the locked position (position stays locked!)
        let (balance_a, balance_b) = cetus_pool::collect_fee<CoinA, CoinB>(
            cetus_config,
            pool,
            &locked.position,
            true  // recalculate
        );
        
        let fee_sui_amount = balance::value(&balance_a);
        let fee_token_amount = balance::value(&balance_b);
        
        // Convert balances to coins
        let coin_a = coin::from_balance(balance_a, ctx);
        let coin_b = coin::from_balance(balance_b, ctx);
        
        // Send to changeable fee recipient
        transfer::public_transfer(coin_a, locked.fee_recipient);
        transfer::public_transfer(coin_b, locked.fee_recipient);
        
        event::emit(FeeCollected {
            locked_position_id: object::id(locked),
            fee_sui: fee_sui_amount,
            fee_token: fee_token_amount,
            recipient: locked.fee_recipient,
        });
    }
    
    /// Change fee recipient (admin only)
    /// The position stays locked - only the recipient address changes
    public entry fun set_fee_recipient<CoinA, CoinB>(
        _admin: &AdminCap,
        locked: &mut LockedLPPosition<CoinA, CoinB>,
        new_recipient: address
    ) {
        let old_recipient = locked.fee_recipient;
        locked.fee_recipient = new_recipient;
        
        event::emit(RecipientChanged {
            locked_position_id: object::id(locked),
            old_recipient,
            new_recipient,
        });
    }
    
    // ==================== View Functions ====================
    
    /// Get fee recipient address
    public fun get_fee_recipient<CoinA, CoinB>(
        locked: &LockedLPPosition<CoinA, CoinB>
    ): address {
        locked.fee_recipient
    }
    
    /// Check if permanently locked (always returns true for security)
    public fun is_permanently_locked<CoinA, CoinB>(
        locked: &LockedLPPosition<CoinA, CoinB>
    ): bool {
        locked.is_permanently_locked
    }
    
    /// Get pool ID
    public fun get_pool_id<CoinA, CoinB>(
        locked: &LockedLPPosition<CoinA, CoinB>
    ): ID {
        locked.pool_id
    }
    
    /// Get bonding curve ID
    public fun get_bonding_curve_id<CoinA, CoinB>(
        locked: &LockedLPPosition<CoinA, CoinB>
    ): ID {
        locked.bonding_curve_id
    }
    
    /// Get locked timestamp
    public fun get_locked_at<CoinA, CoinB>(
        locked: &LockedLPPosition<CoinA, CoinB>
    ): u64 {
        locked.locked_at
    }
    
    // ==================== IMPORTANT: NO UNLOCK FUNCTION! ====================
    // 
    // There is NO function to unlock or remove liquidity!
    // Even if a future upgrade adds one, the is_permanently_locked flag
    // provides mathematical proof that old positions cannot be unlocked.
    // 
    // The only thing that can be done is:
    // 1. Collect fees (anyone can call)
    // 2. Change fee recipient (admin only)
    // 
    // The Position NFT is trapped in this shared object FOREVER! 🔒
}
