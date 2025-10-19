/// Simple constant-product AMM for meme token graduation
/// Implements x * y = k formula for token swaps
/// Designed for bonding curve graduation and permanent LP locking
module suilfg_launch::simple_amm {
    use sui::object::{Self, UID};
    use sui::tx_context::{TxContext, sender};
    use sui::transfer;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    
    // ==================== Errors ====================
    
    const E_ZERO_AMOUNT: u64 = 1;
    const E_INSUFFICIENT_LIQUIDITY: u64 = 2;
    const E_SLIPPAGE_EXCEEDED: u64 = 3;
    const E_INSUFFICIENT_OUTPUT: u64 = 4;
    const E_POOL_ALREADY_EXISTS: u64 = 5;
    
    // ==================== Constants ====================
    
    const FEE_BPS: u64 = 30; // 0.3% trading fee
    const BPS_DENOMINATOR: u64 = 10000;
    
    // ==================== Structs ====================
    
    /// Liquidity pool for TOKEN/SUI pair
    /// Uses constant product formula: token_reserve * sui_reserve = k
    public struct Pool<phantom T> has key, store {
        id: UID,
        token_reserve: Balance<T>,
        sui_reserve: Balance<SUI>,
        lp_supply: u64, // Total LP tokens issued
    }
    
    /// LP position representing share of pool
    /// Can be locked permanently in lp_locker module
    public struct LPPosition<phantom T> has key, store {
        id: UID,
        pool_id: address,
        lp_amount: u64,
    }
    
    // ==================== Events ====================
    
    public struct PoolCreated<phantom T> has copy, drop {
        pool_id: address,
        token_amount: u64,
        sui_amount: u64,
        creator: address,
    }
    
    public struct LiquidityAdded<phantom T> has copy, drop {
        pool_id: address,
        token_amount: u64,
        sui_amount: u64,
        lp_minted: u64,
        provider: address,
    }
    
    public struct Swapped<phantom T> has copy, drop {
        pool_id: address,
        sui_in: u64,
        token_out: u64,
        trader: address,
    }
    
    // ==================== Pool Creation ====================
    
    /// Create new liquidity pool with initial liquidity
    /// Called during bonding curve graduation
    public fun create_pool<T>(
        token: Balance<T>,
        sui: Balance<SUI>,
        ctx: &mut TxContext
    ): LPPosition<T> {
        let token_amount = balance::value(&token);
        let sui_amount = balance::value(&sui);
        
        assert!(token_amount > 0, E_ZERO_AMOUNT);
        assert!(sui_amount > 0, E_ZERO_AMOUNT);
        
        // Initial LP tokens = sqrt(token_amount * sui_amount)
        // Using approximation: (token_amount + sui_amount) / 2 for simplicity
        let lp_amount = (token_amount + sui_amount) / 2;
        
        let pool = Pool<T> {
            id: object::new(ctx),
            token_reserve: token,
            sui_reserve: sui,
            lp_supply: lp_amount,
        };
        
        let pool_id = object::id_address(&pool);
        
        event::emit(PoolCreated<T> {
            pool_id,
            token_amount,
            sui_amount,
            creator: sender(ctx),
        });
        
        // Make pool shared so anyone can trade
        transfer::share_object(pool);
        
        // Return LP position to caller (will be locked permanently)
        LPPosition<T> {
            id: object::new(ctx),
            pool_id,
            lp_amount,
        }
    }
    
    // ==================== Trading Functions ====================
    
    /// Swap SUI for tokens
    /// Applies 0.3% fee and uses constant product formula
    public fun swap_sui_for_token<T>(
        pool: &mut Pool<T>,
        sui_in: Coin<SUI>,
        min_token_out: u64,
        ctx: &mut TxContext
    ): Coin<T> {
        let sui_amount = coin::value(&sui_in);
        assert!(sui_amount > 0, E_ZERO_AMOUNT);
        
        // Calculate output using constant product formula
        let token_out = get_token_output_amount<T>(pool, sui_amount);
        assert!(token_out >= min_token_out, E_SLIPPAGE_EXCEEDED);
        assert!(token_out > 0, E_INSUFFICIENT_OUTPUT);
        
        // Add SUI to pool
        let sui_balance = coin::into_balance(sui_in);
        balance::join(&mut pool.sui_reserve, sui_balance);
        
        // Remove tokens from pool
        let token_balance = balance::split(&mut pool.token_reserve, token_out);
        
        event::emit(Swapped<T> {
            pool_id: object::id_address(pool),
            sui_in: sui_amount,
            token_out,
            trader: sender(ctx),
        });
        
        coin::from_balance(token_balance, ctx)
    }
    
    /// Swap tokens for SUI
    public fun swap_token_for_sui<T>(
        pool: &mut Pool<T>,
        token_in: Coin<T>,
        min_sui_out: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        let token_amount = coin::value(&token_in);
        assert!(token_amount > 0, E_ZERO_AMOUNT);
        
        // Calculate output using constant product formula
        let sui_out = get_sui_output_amount<T>(pool, token_amount);
        assert!(sui_out >= min_sui_out, E_SLIPPAGE_EXCEEDED);
        assert!(sui_out > 0, E_INSUFFICIENT_OUTPUT);
        
        // Add tokens to pool
        let token_balance = coin::into_balance(token_in);
        balance::join(&mut pool.token_reserve, token_balance);
        
        // Remove SUI from pool
        let sui_balance = balance::split(&mut pool.sui_reserve, sui_out);
        
        coin::from_balance(sui_balance, ctx)
    }
    
    // ==================== View Functions ====================
    
    /// Calculate token output for given SUI input
    /// Formula: token_out = (token_reserve * sui_in * (10000 - fee)) / (sui_reserve * 10000 + sui_in * (10000 - fee))
    public fun get_token_output_amount<T>(
        pool: &Pool<T>,
        sui_in: u64
    ): u64 {
        let token_reserve = balance::value(&pool.token_reserve);
        let sui_reserve = balance::value(&pool.sui_reserve);
        
        // Apply fee: sui_in_with_fee = sui_in * (10000 - 30) / 10000
        let sui_in_with_fee = sui_in * (BPS_DENOMINATOR - FEE_BPS);
        
        // Calculate output: (token_reserve * sui_in_with_fee) / (sui_reserve * 10000 + sui_in_with_fee)
        let numerator = (token_reserve as u128) * (sui_in_with_fee as u128);
        let denominator = (sui_reserve as u128) * (BPS_DENOMINATOR as u128) + (sui_in_with_fee as u128);
        
        ((numerator / denominator) as u64)
    }
    
    /// Calculate SUI output for given token input
    public fun get_sui_output_amount<T>(
        pool: &Pool<T>,
        token_in: u64
    ): u64 {
        let token_reserve = balance::value(&pool.token_reserve);
        let sui_reserve = balance::value(&pool.sui_reserve);
        
        // Apply fee
        let token_in_with_fee = token_in * (BPS_DENOMINATOR - FEE_BPS);
        
        // Calculate output
        let numerator = (sui_reserve as u128) * (token_in_with_fee as u128);
        let denominator = (token_reserve as u128) * (BPS_DENOMINATOR as u128) + (token_in_with_fee as u128);
        
        ((numerator / denominator) as u64)
    }
    
    /// Get pool reserves
    public fun get_reserves<T>(pool: &Pool<T>): (u64, u64) {
        (
            balance::value(&pool.token_reserve),
            balance::value(&pool.sui_reserve)
        )
    }
    
    /// Get LP position details
    public fun get_lp_amount<T>(position: &LPPosition<T>): u64 {
        position.lp_amount
    }
    
    public fun get_pool_id<T>(position: &LPPosition<T>): address {
        position.pool_id
    }
    
    // ==================== LP Position Management ====================
    
    /// Share LP position object (called from other modules like lp_locker)
    public fun share_lp_position<T>(position: LPPosition<T>) {
        transfer::share_object(position);
    }
    
    /// Transfer LP position to address
    public fun transfer_lp_position<T>(position: LPPosition<T>, recipient: address) {
        transfer::transfer(position, recipient);
    }
}
