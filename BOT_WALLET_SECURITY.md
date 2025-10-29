# Bot Wallet Security - Funding Strategy

## 🔐 Why "Funded but Not Over-Funded"?

### ⚠️ UPDATE: Gas Now Paid from Curve SUI!

**Important:** The bot now uses **SUI from the bonding curve** for gas, not from bot wallet funding!

See `GAS_PAYMENT_EXPLAINED.md` for full details.

### Bot Wallet Now Needs:

**Testnet:** 0.5-1 SUI (just for AdminCap calls)  
**Mainnet:** 1-2 SUI (minimal buffer)

All pool creation gas is paid from the ~12K SUI extracted from each curve! ✅

---

### The Risk (Still Relevant for Security)

Your bot wallet contains a **private key/seed phrase stored in plaintext** on your server (`.env` file).

**If someone gains access to your server:**
```bash
# Attacker SSHs into your server
ssh ubuntu@13.60.235.109

# Reads your .env file
cat /var/www/Sweet-surprise/pool-creation-bot/.env

# Gets your BOT_SEED_PHRASE or BOT_PRIVATE_KEY
# Imports to their wallet
# Steals all SUI! 💸
```

**Therefore:**
- ❌ **Don't** put 10,000 SUI in bot wallet (huge risk!)
- ✅ **Do** put 1-2 SUI (minimal risk, enough for AdminCap calls)

---

## 💰 How Much to Fund?

### Gas Consumption Per Pool

Each pool creation uses **~0.15 SUI**:

| Transaction | Gas Cost |
|-------------|----------|
| `prepare_liquidity_for_bot()` | ~0.05 SUI |
| Create Cetus pool | ~0.05 SUI |
| Add liquidity + Burn LP | ~0.05 SUI |
| **Total per pool** | **~0.15 SUI** |

### Recommended Funding Amounts

#### Testnet (Low Traffic)

```bash
Funding: 2-5 SUI

Why:
- Expected traffic: 1-10 graduations/day
- 5 SUI = ~33 pools
- ~3-7 days of runway
- Low loss if compromised
```

**Example:**
```bash
# Initial funding
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --data-raw '{"FixedAmountRequest":{"recipient":"<BOT_ADDRESS>"}}'
# Gets 1 SUI

# Request 2-3 more times
# Total: 3-4 SUI (plenty for testing)
```

#### Mainnet (Production) - Low Volume

```bash
Funding: 10-20 SUI initially

Why:
- Expected traffic: 10-50 graduations/day
- 20 SUI = ~133 pools
- ~3-13 days of runway
- Manageable loss if compromised
- Refill weekly
```

#### Mainnet (Production) - High Volume

```bash
Funding: 50-100 SUI initially

Why:
- Expected traffic: 100-500 graduations/day
- 100 SUI = ~666 pools
- ~1-7 days of runway
- Set up auto-monitoring
- Refill every 2-3 days
```

#### Mainnet (Production) - VIRAL 🚀

```bash
Funding: 200-500 SUI

Why:
- Expected traffic: 1000+ graduations/day
- 500 SUI = ~3,333 pools
- ~3 days of runway
- Need 24/7 monitoring
- Auto-refill system recommended
```

---

## 🎯 Funding Strategy by Stage

### Stage 1: Initial Testnet (NOW)

```bash
Fund with: 2-5 SUI (testnet)
How: Faucet
Monitor: Daily
Refill: When < 1 SUI
```

**Script:**
```bash
# Check balance
sui client balance --address <BOT_ADDRESS>

# If low, refill from faucet
curl -X POST 'https://faucet.testnet.sui.io/gas' \
  -H 'Content-Type: application/json' \
  -d '{"FixedAmountRequest":{"recipient":"<BOT_ADDRESS>"}}'
```

### Stage 2: Mainnet Launch

```bash
Fund with: 10-20 SUI (real money!)
How: Transfer from your main wallet
Monitor: Daily
Refill: When < 5 SUI
```

**Script:**
```bash
# Transfer from main wallet to bot
sui client transfer --to <BOT_ADDRESS> \
  --amount 10000000000 \  # 10 SUI (in MIST)
  --gas-budget 10000000
```

### Stage 3: Mainnet High Volume

```bash
Fund with: 50-100 SUI
How: Transfer from treasury
Monitor: Every 4-8 hours
Refill: When < 20 SUI
Auto-alert: Set up monitoring
```

### Stage 4: Mainnet VIRAL

```bash
Fund with: 200-500 SUI
How: Transfer from treasury
Monitor: Every 1-2 hours (or automated)
Refill: When < 50 SUI
Auto-refill: Implement automated top-up
```

---

## 📊 Risk vs Reward Analysis

### Scenario: Bot Compromised

| Funding Amount | Pools It Can Create | Loss if Stolen | Recommendation |
|----------------|---------------------|----------------|----------------|
| 1 SUI | 6 pools | $2 | ⚠️ Too low |
| 5 SUI | 33 pools | $10 | ✅ Safe for testnet |
| 10 SUI | 66 pools | $20 | ✅ Good for mainnet start |
| 50 SUI | 333 pools | $100 | ✅ Good for medium traffic |
| 100 SUI | 666 pools | $200 | ⚠️ Monitor closely |
| 500 SUI | 3,333 pools | $1,000 | ⚠️ Only if viral |
| 10,000 SUI | 66,666 pools | $20,000 | ❌ NEVER! |

**Golden Rule:**
> Only keep enough SUI for 3-7 days of expected operation

---

## 🚨 Security Best Practices

### 1. Minimal Funding

```bash
# Bad: Over-funded
Bot wallet: 10,000 SUI ❌
# If stolen = $20,000 loss!

# Good: Right-sized
Bot wallet: 50 SUI ✅
# If stolen = $100 loss (acceptable risk)
```

### 2. Separate Hot/Cold Wallets

```javascript
Architecture:
┌─────────────────┐
│ Cold Wallet     │ ← Main treasury (1M+ SUI)
│ (Hardware)      │   Offline, secure
└────────┬────────┘
         │ Transfers only when needed
         ↓
┌─────────────────┐
│ Hot Wallet      │ ← Operations wallet (1,000 SUI)
│ (Main Server)   │   Used for manual operations
└────────┬────────┘
         │ Auto-refill when low
         ↓
┌─────────────────┐
│ Bot Wallet      │ ← Automated bot (50-100 SUI)
│ (Bot Server)    │   Only what's needed for 3-7 days
└─────────────────┘
```

### 3. Server Security

**Protect your .env file:**

```bash
# Restrict file permissions
chmod 600 /var/www/Sweet-surprise/pool-creation-bot/.env

# Only bot user can read
chown ubuntu:ubuntu .env

# Verify
ls -la .env
# Output: -rw------- 1 ubuntu ubuntu ... .env
```

**Firewall configuration:**

```bash
# Only allow SSH from your IP
sudo ufw allow from YOUR_IP to any port 22
sudo ufw enable

# Deny all other SSH attempts
sudo ufw deny 22
```

### 4. Monitoring & Alerts

**Set up balance alerts:**

```javascript
// Add to bot (index.js)
async function checkGasBalance() {
  const balance = await client.getBalance({
    owner: botAddress,
    coinType: '0x2::sui::SUI'
  });
  
  const balanceSUI = Number(balance.totalBalance) / 1e9;
  
  // Alert if low
  if (balanceSUI < 5) {
    logger.warn('⚠️ LOW GAS ALERT!', {
      balance: balanceSUI,
      recommendation: 'Refill soon'
    });
    
    // Send notification (email/Telegram/Discord)
    await sendAlert(`Bot gas low: ${balanceSUI} SUI`);
  }
  
  // Critical alert
  if (balanceSUI < 1) {
    logger.error('🚨 CRITICAL GAS!', {
      balance: balanceSUI,
      action: 'Bot may stop working'
    });
    
    await sendUrgentAlert(`URGENT: Bot only has ${balanceSUI} SUI!`);
  }
}

// Check every 10 minutes
setInterval(checkGasBalance, 600000);
```

### 5. Automated Top-Up (Optional)

**For high-volume mainnet:**

```javascript
// Auto-refill from hot wallet when low
async function autoRefill() {
  const balance = await client.getBalance({
    owner: botAddress,
    coinType: '0x2::sui::SUI'
  });
  
  const balanceSUI = Number(balance.totalBalance) / 1e9;
  
  // Refill if below threshold
  if (balanceSUI < 20) {  // Threshold: 20 SUI
    const refillAmount = 50;  // Refill to 50 SUI
    
    logger.info('Auto-refilling bot wallet', {
      currentBalance: balanceSUI,
      refillAmount
    });
    
    // Transfer from hot wallet to bot
    await transferFromHotWallet(botAddress, refillAmount);
    
    logger.info('✅ Refill complete');
  }
}
```

---

## 📈 Monitoring Scripts

### Daily Balance Check

```bash
#!/bin/bash
# check-bot-balance.sh

BOT_ADDRESS="<YOUR_BOT_ADDRESS>"
THRESHOLD=5  # Alert if below 5 SUI

# Get balance
BALANCE=$(sui client balance --address $BOT_ADDRESS | grep "SUI" | awk '{print $4}')

echo "Bot balance: $BALANCE SUI"

# Alert if low
if (( $(echo "$BALANCE < $THRESHOLD" | bc -l) )); then
  echo "⚠️ WARNING: Bot balance low! Please refill."
  # Send notification (customize)
  curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
    -d "chat_id=<CHAT_ID>&text=Bot gas low: $BALANCE SUI"
fi
```

**Set up cron job:**

```bash
# Run every 4 hours
0 */4 * * * /path/to/check-bot-balance.sh
```

### Weekly Refill Reminder

```bash
#!/bin/bash
# weekly-refill-reminder.sh

echo "📅 Weekly bot maintenance reminder:"
echo "1. Check bot balance"
echo "2. Review logs for errors"
echo "3. Verify PM2 status"
echo "4. Check recent pool creations"

# Send to you
mail -s "Bot Maintenance Reminder" your@email.com < reminder.txt
```

**Cron:**

```bash
# Every Monday at 9am
0 9 * * 1 /path/to/weekly-refill-reminder.sh
```

---

## 🎯 Practical Examples

### Example 1: Testnet Testing (NOW)

```bash
# Your situation
Network: Testnet
Expected traffic: 1-5 graduations/day
Duration: 1-2 weeks of testing

# Recommended funding
Initial: 3-5 SUI (from faucet)
Refill when: < 1 SUI
Max loss risk: $0 (testnet)

# Commands
curl -X POST 'https://faucet.testnet.sui.io/gas' \
  -H 'Content-Type: application/json' \
  -d '{"FixedAmountRequest":{"recipient":"<BOT_ADDRESS>"}}'

# Repeat 3-5 times to get 3-5 SUI
```

### Example 2: Mainnet Soft Launch

```bash
# Scenario
Network: Mainnet
Expected traffic: 10-20 graduations/day
Marketing: Minimal

# Recommended funding
Initial: 10-15 SUI
Monitor: Daily
Refill when: < 5 SUI
Max loss risk: $20-30

# Strategy
Week 1: Start with 10 SUI, monitor closely
Week 2: Adjust based on actual usage
Week 3: Settle into routine refill schedule
```

### Example 3: Mainnet Viral Event

```bash
# Scenario
Network: Mainnet
Expected traffic: 1000+ graduations/day
Marketing: Major campaign

# Recommended funding
Initial: 200-300 SUI
Monitor: Every 2-4 hours
Refill when: < 50 SUI
Auto-alert: Yes
Max loss risk: $400-600 (acceptable during viral moment)

# Strategy
Pre-event: Fund with 200 SUI
During event: Monitor constantly, refill every 4-6 hours
Post-event: Scale back to normal funding
```

---

## 💡 Pro Tips

### Tip 1: Multiple Small Refills > One Large Deposit

```bash
# Bad
Fund once with 1,000 SUI ❌
# Risk: If compromised = $2,000 loss

# Good
Fund 50 SUI, refill every 2-3 days ✅
# Risk: If compromised = $100 loss
```

### Tip 2: Separate Bot for Fee Collection

```bash
# Don't use same wallet for:
# - Pool creation (needs gas)
# - Fee collection (accumulates value)

# Use separate wallets:
Bot Wallet: For pool creation only (50-100 SUI)
Fee Wallet: For collecting fees (can accumulate)
```

### Tip 3: Test on Testnet First

```bash
# Before mainnet
1. Fund testnet bot with 5 SUI
2. Run for 1-2 weeks
3. Monitor actual gas consumption
4. Calculate real-world needs
5. Then fund mainnet accordingly
```

### Tip 4: Set Up Alerts Early

```bash
# Don't wait for problems
# Set up monitoring from day 1:

1. Balance alerts (< 5 SUI warning)
2. Transaction failure alerts
3. Daily summary emails
4. Weekly review reminders
```

---

## 📋 Quick Reference

### Funding Recommendations

| Situation | Amount | Refill Frequency | Risk |
|-----------|--------|------------------|------|
| Testnet testing | 3-5 SUI | Weekly | None |
| Mainnet start | 10-20 SUI | Every 3-5 days | Low |
| Mainnet medium | 50-100 SUI | Every 2-3 days | Medium |
| Mainnet viral | 200-500 SUI | Daily | High |

### Risk Tolerance

| Your Risk Tolerance | Funding Strategy |
|---------------------|------------------|
| Very conservative | 10-20 SUI, refill every 2 days |
| Balanced | 50-100 SUI, refill weekly |
| Aggressive | 200-500 SUI, monitor daily |

### Commands

```bash
# Check balance
sui client balance --address <BOT_ADDRESS>

# Refill (testnet)
curl -X POST 'https://faucet.testnet.sui.io/gas' \
  -d '{"FixedAmountRequest":{"recipient":"<BOT_ADDRESS>"}}'

# Refill (mainnet)
sui client transfer --to <BOT_ADDRESS> \
  --amount 50000000000 \  # 50 SUI
  --gas-budget 10000000

# Monitor logs for gas usage
grep "Gas used" logs/combined.log
```

---

## 🎯 Bottom Line

**The Security Principle:**

> **Only keep in the bot wallet what you can afford to lose if the server is compromised**

**For your situation (testnet now):**
- ✅ Fund with 3-5 SUI (from faucet)
- ✅ Monitor daily
- ✅ Refill when < 1 SUI
- ✅ Zero risk (testnet has no value)

**For mainnet later:**
- ✅ Start with 10-20 SUI
- ✅ Scale up gradually based on traffic
- ✅ Never exceed 7 days of runway
- ✅ Set up automated monitoring

**Remember:**
- More funding ≠ Better performance
- More funding = Higher risk
- Right-sizing = Best practice

---

**Questions about funding strategy? Let me know!** 🔐
