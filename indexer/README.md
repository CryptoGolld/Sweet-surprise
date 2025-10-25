# Memecoin Indexer

Real-time blockchain indexer for your memecoin platform.

## Quick Start

### 1. Setup (Run once):
```bash
cd indexer
chmod +x setup.sh
./setup.sh
```

### 2. Configure:
```bash
nano .env
# Update DATABASE_URL with your PostgreSQL password
```

### 3. Run:
```bash
# Test mode
npm start

# Production (runs 24/7)
pm2 start index.js --name memecoin-indexer
pm2 save
pm2 startup  # Auto-start on reboot
```

## What It Does

- ✅ Watches `TokenCreated` events in real-time
- ✅ Stores all tokens in PostgreSQL
- ✅ Updates token data (supply, balance, graduated status)
- ✅ Provides instant queries (no blockchain delay)
- ✅ Auto-restarts on crashes

## API Endpoints

Your Next.js app can query:
- `GET /api/tokens` - All tokens (fast from DB)
- `GET /api/portfolio/:address` - User portfolio data

## Monitoring

```bash
# View logs
pm2 logs memecoin-indexer

# Check status
pm2 status

# Restart
pm2 restart memecoin-indexer
```

## Database

```bash
# Connect to database
psql -U postgres -d memecoins

# View tokens
SELECT ticker, curve_supply, created_at FROM tokens ORDER BY created_at DESC LIMIT 10;

# View trades
SELECT * FROM trades ORDER BY timestamp DESC LIMIT 10;
```

## Troubleshooting

**Indexer not starting:**
```bash
pm2 logs memecoin-indexer --lines 50
```

**Database connection failed:**
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Check credentials in `.env`

**No events found:**
- Verify PLATFORM_PACKAGE address in `.env`
- Check network (testnet/mainnet) in SUI_RPC_URL

## Performance

- Processes ~100 events/second
- Database queries: < 10ms
- Catches up on 1000 old events: ~2 minutes
- Ongoing indexing: real-time (2s delay)

## Future Enhancements

- [ ] Index Buy/Sell events for trade history
- [ ] Calculate 24h volume
- [ ] Track holder counts
- [ ] Generate price charts (OHLCV candles)
- [ ] WebSocket for live updates
