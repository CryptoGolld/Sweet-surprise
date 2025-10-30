# SuiLFG Pool Creation Bot

Automated bot that creates Cetus pools and burns LP tokens for graduated bonding curves.

## Features

- ✅ Monitors blockchain for graduation events
- ✅ Automatically extracts liquidity from graduated curves
- ✅ Creates Cetus pools with optimal parameters
- ✅ Adds full-range liquidity
- ✅ Burns LP tokens using Cetus Burn Manager (permanent lock)
- ✅ Production-ready with PM2 support
- ✅ Comprehensive error handling and logging

## Prerequisites

- Node.js >= 18.17.0
- A funded wallet with SUI for gas
- AdminCap object for calling `prepare_liquidity_for_bot()`

## Installation

```bash
cd pool-creation-bot
npm install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and set your values:
```bash
# CRITICAL: Set your bot's private key
BOT_PRIVATE_KEY=suiprivkey1234...

# Verify all contract addresses match your deployment
PLATFORM_PACKAGE=0x...
ADMIN_CAP=0x...
```

## Usage

### Development

```bash
npm run dev
```

### Production (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Create logs directory
mkdir -p logs

# Start bot
pm2 start ecosystem.config.js

# View logs
pm2 logs pool-creation-bot

# Monitor
pm2 monit

# Restart
pm2 restart pool-creation-bot

# Stop
pm2 stop pool-creation-bot
```

### View Logs

```bash
# Real-time logs
tail -f logs/combined.log

# Errors only
tail -f logs/error.log

# PM2 logs
pm2 logs pool-creation-bot --lines 100
```

## How It Works

### 1. Graduation Detection
Bot queries blockchain every 10 seconds for `Graduated` events:
```javascript
query: {
  MoveEventType: `${PLATFORM_PACKAGE}::bonding_curve::Graduated`
}
```

Note: Tokens auto-graduate when they hit 737M supply during a buy transaction. The `Graduated` event is emitted automatically by the `buy()` function.

### 2. Liquidity Preparation
Calls `prepare_liquidity_for_bot()` to extract:
- ~12,000 SUILFG (or SUI on mainnet)
- 263M tokens (207M pool + 54M burned + 2M team)

### 3. Pool Creation
Uses Cetus SDK to create pool:
```javascript
await cetusSDK.Pool.createPoolTransactionPayload({
  coinTypeA,
  coinTypeB,
  tickSpacing: 60,
  initializeSqrtPrice,
})
```

### 4. Liquidity Addition
Opens full-range position and adds liquidity:
```javascript
await cetusSDK.Position.openPositionTransactionPayload({
  poolAddress,
  tickLower: -443636,
  tickUpper: 443636,
})
```

### 5. LP Burning
Burns LP tokens using Cetus Burn Manager for permanent lock:
```javascript
await burnManager.createBurnTransaction({
  positionId,
  recipient: botAddress,
})
```

## Security

### Private Key Protection
- **NEVER** commit `.env` to git
- Use environment variables in production
- Consider using a hardware wallet or KMS for mainnet

### Bot Wallet Security
- Keep bot wallet funded but not overfunded
- Only has AdminCap, not platform funds
- All LP tokens are burned (can't be withdrawn)

## Monitoring

### Health Checks
Monitor logs for:
- ✅ `Bot initialized` - Startup successful
- 🎓 `Graduation detected` - New graduation found
- 🏊 `Creating Cetus pool` - Pool creation started
- 🔥 `LP tokens burned` - Process complete
- ❌ Any ERROR logs

### Alerts
Set up alerts for:
- Bot crashes (PM2 restarts)
- Transaction failures
- Network connectivity issues
- Low gas balance

## Troubleshooting

### Bot not detecting graduations
- Check RPC URL is correct
- Verify PLATFORM_PACKAGE address
- Check network connectivity

### Transaction failures
- Verify bot wallet has gas (SUI)
- Check AdminCap is in bot wallet
- Verify contract addresses are correct

### Pool creation fails
- Check coin type ordering (must be lexicographic)
- Verify tick spacing is valid (60 recommended)
- Check sqrt price calculation

### LP burn fails
- Verify Cetus Burn Manager is available on network
- Check position ID is valid
- Ensure position has liquidity

## Mainnet Deployment

### Checklist
- [ ] Update `.env` for mainnet:
  - [ ] `NETWORK=mainnet`
  - [ ] `RPC_URL=https://fullnode.mainnet.sui.io:443`
  - [ ] Mainnet contract addresses
  - [ ] Mainnet Cetus addresses
- [ ] Use dedicated mainnet bot wallet
- [ ] Test on testnet first
- [ ] Set up monitoring and alerts
- [ ] Secure private keys (use KMS)

### Mainnet Cetus Addresses
Update in `.env`:
```bash
CETUS_GLOBAL_CONFIG=0x... # Mainnet config
CETUS_POOLS=0x...         # Mainnet pools
```

## Support

For issues or questions:
1. Check logs: `pm2 logs pool-creation-bot`
2. Verify configuration in `.env`
3. Test on testnet first
4. Review Cetus docs: https://cetus-1.gitbook.io/cetus-developer-docs

## License

MIT
