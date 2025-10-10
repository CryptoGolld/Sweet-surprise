module suilfg_launch::platform_config {
    use sui::object::{UID};
    use sui::object;
    use sui::tx_context::{TxContext, sender};
    use sui::transfer;

    /// Shared platform configuration object
    public struct PlatformConfig has key {
        id: UID,
        treasury_address: address,
        creation_is_paused: bool,
        first_buyer_fee_mist: u64,
        default_platform_fee_bps: u64,
        default_creator_fee_bps: u64,
        graduation_reward_sui: u64,
        // Default bonding curve scale m = m_num / m_den
        default_m_num: u64,
        default_m_den: u64,
        // Permissionless graduation params
        default_graduation_target_mist: u64,
        platform_cut_bps_on_graduation: u64,
        creator_graduation_payout_mist: u64,
        default_cetus_bump_bps: u64,
    }

    /// Capability that authorizes admin-only operations
    public struct AdminCap has key, store { id: UID }

    const DEFAULT_FIRST_BUYER_FEE_MIST: u64 = 1_000_000_000; // 1 SUI
    const DEFAULT_PLATFORM_FEE_BPS: u64 = 450; // 4.5%
    const DEFAULT_CREATOR_FEE_BPS: u64 = 50; // 0.5%
    const DEFAULT_GRADUATION_REWARD_SUI: u64 = 100_000_000_000; // 100 SUI
    const DEFAULT_M_NUM: u64 = 294; // default m = 294/1000000 for ~$1k starting MC at SUI=$3.4
    const DEFAULT_M_DEN: u64 = 1_000_000;
    // Default graduation target: 10,000 SUI (in Mist)
    const DEFAULT_GRADUATION_TARGET_MIST: u64 = 10_000 * 1_000_000_000;
    // Platform cut at graduation: 5% (adjustable)
    const DEFAULT_PLATFORM_CUT_BPS_ON_GRADUATION: u64 = 500;
    // Creator payout at graduation: 40 SUI (in Mist)
    const DEFAULT_CREATOR_GRADUATION_PAYOUT_MIST: u64 = 40 * 1_000_000_000;
    // Default AMM bump over curve spot price at seeding (10% = 1000 bps)
    const DEFAULT_CETUS_BUMP_BPS: u64 = 1_000;

    public fun get_treasury_address(cfg: &PlatformConfig): address { cfg.treasury_address }
    public fun get_creation_is_paused(cfg: &PlatformConfig): bool { cfg.creation_is_paused }
    public fun get_first_buyer_fee_mist(cfg: &PlatformConfig): u64 { cfg.first_buyer_fee_mist }
    public fun get_default_platform_fee_bps(cfg: &PlatformConfig): u64 { cfg.default_platform_fee_bps }
    public fun get_default_creator_fee_bps(cfg: &PlatformConfig): u64 { cfg.default_creator_fee_bps }
    public fun get_graduation_reward_sui(cfg: &PlatformConfig): u64 { cfg.graduation_reward_sui }
    public fun get_default_m_num(cfg: &PlatformConfig): u64 { cfg.default_m_num }
    public fun get_default_m_den(cfg: &PlatformConfig): u64 { cfg.default_m_den }
    public fun get_default_graduation_target_mist(cfg: &PlatformConfig): u64 { cfg.default_graduation_target_mist }
    public fun get_platform_cut_bps_on_graduation(cfg: &PlatformConfig): u64 { cfg.platform_cut_bps_on_graduation }
    public fun get_creator_graduation_payout_mist(cfg: &PlatformConfig): u64 { cfg.creator_graduation_payout_mist }
    public fun get_default_cetus_bump_bps(cfg: &PlatformConfig): u64 { cfg.default_cetus_bump_bps }

    /// One-time module initializer (Sui requirement: internal, witness + ctx)
    fun init(_w: PLATFORM_CONFIG, ctx: &mut TxContext) {
        let admin = AdminCap { id: object::new(ctx) };
        let cfg = PlatformConfig {
            id: object::new(ctx),
            treasury_address: sender(ctx),
            creation_is_paused: false,
            first_buyer_fee_mist: DEFAULT_FIRST_BUYER_FEE_MIST,
            default_platform_fee_bps: DEFAULT_PLATFORM_FEE_BPS,
            default_creator_fee_bps: DEFAULT_CREATOR_FEE_BPS,
            graduation_reward_sui: DEFAULT_GRADUATION_REWARD_SUI,
            default_m_num: DEFAULT_M_NUM,
            default_m_den: DEFAULT_M_DEN,
            default_graduation_target_mist: DEFAULT_GRADUATION_TARGET_MIST,
            platform_cut_bps_on_graduation: DEFAULT_PLATFORM_CUT_BPS_ON_GRADUATION,
            creator_graduation_payout_mist: DEFAULT_CREATOR_GRADUATION_PAYOUT_MIST,
            default_cetus_bump_bps: DEFAULT_CETUS_BUMP_BPS,
        };
        transfer::share_object(cfg);
        transfer::transfer(admin, sender(ctx));
    }

    public struct PLATFORM_CONFIG has drop {}

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

    public entry fun set_default_m(_admin: &AdminCap, cfg: &mut PlatformConfig, m_num: u64, m_den: u64) {
        assert!(m_den > 0, 1001);
        assert!(m_num > 0, 1002);
        cfg.default_m_num = m_num;
        cfg.default_m_den = m_den;
    }

    public entry fun set_platform_cut_on_graduation(_admin: &AdminCap, cfg: &mut PlatformConfig, cut_bps: u64) {
        assert!(cut_bps <= 10_000, 1003);
        cfg.platform_cut_bps_on_graduation = cut_bps;
    }

    public entry fun set_creator_graduation_payout(_admin: &AdminCap, cfg: &mut PlatformConfig, payout_mist: u64) {
        cfg.creator_graduation_payout_mist = payout_mist;
    }

    public entry fun set_default_cetus_bump_bps(_admin: &AdminCap, cfg: &mut PlatformConfig, bump_bps: u64) {
        assert!(bump_bps <= 10_000, 1004);
        cfg.default_cetus_bump_bps = bump_bps;
    }
}
