/// Template for creating memecoins on SuiLFG MemeFi Platform
/// 
/// CRITICAL RULE: The one-time witness struct MUST be the uppercase version of the module name
/// 
/// The coin type will be: PACKAGE_ID::MODULE_NAME::STRUCT_NAME
/// 
/// Example with this template:
/// Module name: pepecoin_memefi
/// Struct name: PEPECOIN_MEMEFI (uppercase of module)
/// Full type:   0xABCD1234...::pepecoin_memefi::PEPECOIN_MEMEFI ✨
/// 
/// This ensures ALL memecoins end with "_MEMEFI" or "_SUILFG_MEMEFI"!

module memecoin_package::pepecoin_memefi {
    use sui::coin::{Self, TreasuryCap};
    use sui::url;

    /// ONE-TIME WITNESS
    /// MUST be uppercase of module name (pepecoin_memefi -> PEPECOIN_MEMEFI)
    /// This becomes the coin type: ::pepecoin_memefi::PEPECOIN_MEMEFI
    public struct PEPECOIN_MEMEFI has drop {}

    /// Initialize function - called automatically on publish
    fun init(witness: PEPECOIN_MEMEFI, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,  // decimals - 6 is common for memecoins
            b"PEPE",  // Symbol - shown in wallets (can be short)
            b"Pepe Coin",  // Name
            b"The dankest meme coin on Sui. Launched on SuiLFG MemeFi Platform.",  // Description
            option::some(url::new_unsafe_from_bytes(b"https://suilfg.com/pepe-icon.png")),  // Icon URL
            ctx
        );

        // Freeze the metadata
        transfer::public_freeze_object(metadata);
        
        // Transfer treasury to the bonding curve or creator
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }
}

// ============================================================================
// MORE EXAMPLES - Different naming patterns you can use:
// ============================================================================

/// Example 1: Short "_memefi" suffix
/// Module: doge_memefi
/// Struct: DOGE_MEMEFI (MUST be uppercase of module)
/// Full type: 0x...::doge_memefi::DOGE_MEMEFI ✨
module memecoin_package::doge_memefi {
    public struct DOGE_MEMEFI has drop {}
    // ... rest of code
}

/// Example 2: Full "_suilfg_memefi" suffix
/// Module: wojak_suilfg_memefi
/// Struct: WOJAK_SUILFG_MEMEFI (MUST be uppercase of module)
/// Full type: 0x...::wojak_suilfg_memefi::WOJAK_SUILFG_MEMEFI ✨
module memecoin_package::wojak_suilfg_memefi {
    public struct WOJAK_SUILFG_MEMEFI has drop {}
    // ... rest of code
}

/// Example 3: Simple "_lfg" suffix
/// Module: shib_lfg
/// Struct: SHIB_LFG (MUST be uppercase of module)
/// Full type: 0x...::shib_lfg::SHIB_LFG ✨
module memecoin_package::shib_lfg {
    public struct SHIB_LFG has drop {}
    // ... rest of code
}

// ============================================================================
// INTEGRATION WITH BONDING CURVE
// ============================================================================

/*
When creating a coin through your bonding curve, you would:

1. User picks a ticker (e.g., "PEPE")
2. Your platform generates:
   - Module name: "pepe_memefi" (lowercase with suffix)
   - Struct name: "PEPE_MEMEFI" (UPPERCASE of module - REQUIRED!)
   - Symbol: "PEPE" (can be simple)
   - Name: "Pepe Coin"
   - Description: "... Launched on SuiLFG MemeFi Platform."

This way EVERY coin launched on your platform has:
- Module ending in "_memefi" or "_suilfg_memefi" 
- Struct ending in "_MEMEFI" or "_SUILFG_MEMEFI" (uppercase of module)
- Clear branding visible in the full coin type!

The full coin type will look like:
0x123abc...::pepe_memefi::PEPE_MEMEFI ✨

Explorer, wallets, and APIs will show the full type - instant brand recognition! 🚀

REMEMBER: The struct name MUST be the uppercase version of the module name!
- Module: pepe_memefi → Struct: PEPE_MEMEFI ✅
- Module: doge_suilfg_memefi → Struct: DOGE_SUILFG_MEMEFI ✅
- Module: pepe_memefi → Struct: PEPE ❌ (won't work!)
*/
