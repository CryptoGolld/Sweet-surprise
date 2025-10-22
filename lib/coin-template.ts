/**
 * Coin template generator for SuiLFG MemeFi platform
 * All coins created have types ending with _SUILFG_MEMEFI
 */

export interface CoinConfig {
  ticker: string;
  name: string;
  description: string;
  decimals: number;
}

export function generateMoveToml(config: CoinConfig): string {
  const moduleName = config.ticker.toLowerCase();
  
  return `[package]
name = "${moduleName}"
version = "0.0.1"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "mainnet-v1.42.2" }

[addresses]
${moduleName} = "0x0"
`;
}

export function generateMoveSource(config: CoinConfig): string {
  const moduleName = config.ticker.toLowerCase();
  const structName = `${config.ticker.toUpperCase()}_SUILFG_MEMEFI`;
  
  return `module ${moduleName}::${moduleName} {
    use sui::coin::{Self, TreasuryCap};
    use sui::tx_context::TxContext;
    use std::option;

    /// The branded coin type for SuiLFG MemeFi platform
    public struct ${structName} has drop {}

    /// Initialize the coin and create TreasuryCap
    fun init(witness: ${structName}, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            ${config.decimals},
            b"${config.ticker}",
            b"${config.name}",
            b"${config.description}",
            option::none(),
            ctx
        );
        
        // Freeze metadata so it can't be changed
        transfer::public_freeze_object(metadata);
        
        // Transfer TreasuryCap to sender (will be used by bonding curve)
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }
}
`;
}

export function getCoinType(packageId: string, ticker: string): string {
  const moduleName = ticker.toLowerCase();
  const structName = `${ticker.toUpperCase()}_SUILFG_MEMEFI`;
  return `${packageId}::${moduleName}::${structName}`;
}
