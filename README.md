# SuiLFG Launch - Memecoin Launchpad

A secure and innovative memecoin launchpad built on Sui blockchain, featuring an advanced bonding curve mechanism and seamless DEX integration.

## 🚀 Features

### Advanced Bonding Curve
- **Formula**: `p(s) = base_price + m × s²`
- **Starting Market Cap**: 1,000 SUI (~$3,400)
- **Graduation Target**: ~13,333 SUI raised
- **Graduation Market Cap**: ~55,000 SUI (~$187k)

### Token Economics
- **Total Supply**: 1 billion tokens (dynamic based on graduation)
- **Dev Allocation**: 1M tokens (0.1% of supply)
- **Community Fund**: 1M tokens (0.1% of supply) 
- **Bonding Curve**: ~737M tokens sold to reach graduation
- **Cetus Pool**: Optimal amount calculated with 10% price bump
- **Burned Tokens**: Remaining tokens never minted (deflationary)

### Fee Structure
- **Platform Fee**: 4.5% on trades
- **Creator Fee**: 0.5% on trades  
- **First Buyer Fee**: 1 SUI (one-time)
- **Platform Graduation Cut**: 5%
- **Creator Graduation Reward**: 40 SUI

## 📊 Bonding Curve Mechanics

### Price Discovery
The bonding curve uses a modified quadratic formula that ensures:
1. **Immediate Price Discovery**: Every token starts with 1k SUI market cap
2. **Exponential Growth**: Early buyers benefit from quadratic price increases
3. **Sustainable Economics**: Reasonable graduation targets prevent bubble formation

### Mathematical Model
```
Price Function: p(s) = 0.000001 + (m_num/m_den) × s²
Cost Integral: ∫p(s)ds = base_price×s + (m/3)×s³
```

**Default Parameters:**
- `base_price = 0.000001 SUI` (ensures 1k starting MC)
- `m_num = 1`
- `m_den = 10^16`

### Graduation Flow
1. **Bonding Curve Trading**: Users buy/sell tokens at algorithmic prices
2. **Graduation Trigger**: When ~13.3k SUI is raised in the reserve
3. **Dev/Community Allocation**: 1M tokens each distributed automatically
4. **Pool Optimization**: Calculate optimal tokens for 10% price bump
5. **Cetus Integration**: Remaining SUI + optimal tokens → DEX liquidity
6. **Token Burn**: Excess tokens never minted (deflationary mechanism)

## 🔧 Smart Contract Architecture

### Core Modules
- **`platform_config`**: Global parameters and admin controls
- **`bonding_curve`**: Trading engine with quadratic pricing
- **`ticker_registry`**: Ticker management and cooldowns (future)

### Security Features
- **Emergency Controls**: Global pause and per-curve freezing
- **Slippage Protection**: Deadline and min/max amount checks
- **Whitelisted Exit**: Controlled unwinding for emergency situations
- **Admin Capabilities**: Multi-signature compatible admin system

## 💰 Economic Model

### Launch Economics
- **Starting Price**: 0.000001 SUI per token
- **Starting Market Cap**: 1,000 SUI (~$3,400)
- **Price Growth**: Quadratic acceleration with early buyer advantage

### Graduation Economics  
- **SUI Raised**: ~13,333 SUI (~$45k trading volume)
- **Market Cap**: ~55,000 SUI (~$187k valuation)
- **Pool Price**: 10% bump over graduation price for positive momentum

### Post-Graduation
- **Cetus Pool**: Professional DEX with deep liquidity
- **Final Supply**: ~936M tokens (64M burned for scarcity)
- **Dev Value**: ~61 SUI worth of tokens (~$207)
- **Community Fund**: ~61 SUI worth of tokens for campaigns

## 🛠 Technical Implementation

### Bonding Curve Formula Updates
The curve has been optimized from pure quadratic to include a base price:

**Previous**: `p(s) = m × s²` (started at 0)
**Current**: `p(s) = base_price + m × s²` (starts at 1k MC)

### Pool Seeding Algorithm
```move
// Calculate optimal tokens for target price bump
let target_price = graduation_price × (1 + bump_percentage);
let optimal_tokens = available_sui ÷ target_price;

// Only mint what's needed, burn the rest
let tokens_to_mint = min(optimal_tokens, remaining_supply);
```

## 📈 Comparison to Pump.fun

| Feature | SuiLFG Launch | Pump.fun |
|---------|---------------|----------|
| **Curve Type** | Quadratic with base | Linear |
| **Starting MC** | 1k SUI (~$3.4k) | ~$5-30k |
| **Graduation** | 13.3k SUI | 85 SOL |
| **Graduation MC** | ~55k SUI (~$187k) | ~$69k |
| **Dev Allocation** | 0.1% + 0.1% community | 0% |
| **Fees** | 5% + 1 SUI first buyer | ~1.5-2% |
| **Token Burn** | Yes (deflationary) | No |

## 🚀 Deployment

### Prerequisites
- Sui CLI installed and configured
- Move 2024 compiler
- Sufficient SUI for deployment gas

### Deploy Steps
```bash
# Build the package
sui move build

# Deploy to network
sui client publish --gas-budget 100000000

# Initialize platform config
sui client call --package $PKG --module platform_config --function init
```

### Configuration
After deployment, configure the platform:
```bash
# Set treasury address
sui client call --package $PKG --module platform_config \
  --function set_treasury_address --args $CONFIG $TREASURY_ADDR

# Adjust bonding curve parameters if needed
sui client call --package $PKG --module platform_config \
  --function set_default_m --args $CONFIG $M_NUM $M_DEN
```

## 🔐 Security Considerations

### Admin Controls
- **Global Pause**: Stop all new token creation
- **Per-Curve Freeze**: Halt trading on specific tokens
- **Whitelisted Exit**: Allow controlled selling during issues
- **Parameter Updates**: Adjust fees and curve parameters

### Economic Security
- **Slippage Protection**: Prevent sandwich attacks
- **Deadline Checks**: Mitigate MEV exploitation  
- **Fee Bounds**: Platform fees capped at reasonable levels
- **Supply Integrity**: Total supply enforced by contract

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

- **Documentation**: See `SuiLFG-Launch-Blueprint.md` for detailed architecture
- **Issues**: Open GitHub issues for bugs and feature requests
- **Community**: Join our Discord for real-time support

---

**Built with ❤️ on Sui blockchain**