module suilfg_launch::platform_config {
    use sui::object::{self, UID, ID};
    use sui::tx_context::{TxContext, sender};
    use sui::transfer;

    /// Shared platform configuration object
    struct PlatformConfig has key {
        id: UID,
        treasury_address: address,
        creation_is_paused: bool,
        first_buyer_fee_mist: u64,
        default_platform_fee_bps: u64,
        default_creator_fee_bps: u64,
        graduation_reward_sui: u64,
    }

    /// Capability that authorizes admin-only operations
    struct AdminCap has key, store { id: UID }

    const DEFAULT_FIRST_BUYER_FEE_MIST: u64 = 1_000_000_000; // 1 SUI
    const DEFAULT_PLATFORM_FEE_BPS: u64 = 450; // 4.5%
    const DEFAULT_CREATOR_FEE_BPS: u64 = 50; // 0.5%
    const DEFAULT_GRADUATION_REWARD_SUI: u64 = 100_000_000_000; // 100 SUI

    public fun get_treasury_address(cfg: &PlatformConfig): address { cfg.treasury_address }
    public fun get_creation_is_paused(cfg: &PlatformConfig): bool { cfg.creation_is_paused }
    public fun get_first_buyer_fee_mist(cfg: &PlatformConfig): u64 { cfg.first_buyer_fee_mist }
    public fun get_default_platform_fee_bps(cfg: &PlatformConfig): u64 { cfg.default_platform_fee_bps }
    public fun get_default_creator_fee_bps(cfg: &PlatformConfig): u64 { cfg.default_creator_fee_bps }
    public fun get_graduation_reward_sui(cfg: &PlatformConfig): u64 { cfg.graduation_reward_sui }

    /// Called automatically when the package is published
    public entry fun init(ctx: &mut TxContext) {
        let admin = AdminCap { id: object::new(ctx) };
        let cfg = PlatformConfig {
            id: object::new(ctx),
            treasury_address: sender(ctx),
            creation_is_paused: false,
            first_buyer_fee_mist: DEFAULT_FIRST_BUYER_FEE_MIST,
            default_platform_fee_bps: DEFAULT_PLATFORM_FEE_BPS,
            default_creator_fee_bps: DEFAULT_CREATOR_FEE_BPS,
            graduation_reward_sui: DEFAULT_GRADUATION_REWARD_SUI,
        };
        transfer::share_object(cfg);
        transfer::transfer(admin, sender(ctx));
    }

    /// Admin setters. AdminCap must be passed in and is returned to the caller.

    public entry fun set_treasury_address(
        _admin: &AdminCap,
        cfg: &mut PlatformConfig,
        new_addr: address
    ) {
        cfg.treasury_address = new_addr;
    }

    public entry fun pause_creation(_admin: &AdminCap, cfg: &mut PlatformConfig) {
        cfg.creation_is_paused = true;
    }

    public entry fun resume_creation(_admin: &AdminCap, cfg: &mut PlatformConfig) {
        cfg.creation_is_paused = false;
    }

    public entry fun set_first_buyer_fee(_admin: &AdminCap, cfg: &mut PlatformConfig, fee_mist: u64) {
        cfg.first_buyer_fee_mist = fee_mist;
    }

    public entry fun set_platform_fee(_admin: &AdminCap, cfg: &mut PlatformConfig, fee_bps: u64) {
        cfg.default_platform_fee_bps = fee_bps;
    }

    public entry fun set_creator_fee(_admin: &AdminCap, cfg: &mut PlatformConfig, fee_bps: u64) {
        cfg.default_creator_fee_bps = fee_bps;
    }

    public entry fun set_graduation_reward(_admin: &AdminCap, cfg: &mut PlatformConfig, amount_sui: u64) {
        cfg.graduation_reward_sui = amount_sui;
    }
}
