# Comprehensive Test Plan for SuiLFG Launch Platform

## Prerequisites ✅
- [x] Sui CLI installed (v1.35.1)
- [x] Project compiles successfully
- [x] Burner wallet created
- [ ] Testnet SUI tokens (need ~10 SUI for testing)

## Test Environment
- **Network**: Sui Testnet
- **Wallet Address**: `0xf8126f74277bcb2242aadd8f0a4780d6330f9a9fda403674de99b43223c0fbcb`
- **Cetus Testnet Global Config**: `0x9774e359588ead122af1c7e7f64e14ade261cfeecdb5d0eb4a5b3b4c8ab8bd3e`

---

## Phase 1: Contract Deployment

### 1.1 Publish Contract
```bash
cd /workspace/suilfg_launch
sui client publish --gas-budget 500000000 --dependencies-are-root
```

**Expected Output**:
- Package ID
- Module IDs (bonding_curve, lp_locker, platform_config, ticker_registry, referral_registry)
- Transaction digest

**Success Criteria**: 
- ✅ All 5 modules published successfully
- ✅ No compilation errors
- ✅ Transaction succeeds

---

## Phase 2: Platform Configuration

### 2.1 Initialize Platform Config
```bash
# This creates AdminCap and PlatformConfig objects
# Should be done in the publish transaction automatically
```

**Test**:
1. Verify AdminCap object exists
2. Verify PlatformConfig object exists
3. Check default values:
   - Treasury address set correctly
   - Platform fee = 10% (default)
   - Creator graduation payout set
   - Cetus Global Config ID matches testnet

**Commands**:
```bash
sui client object <PLATFORM_CONFIG_ID> --json
sui client object <ADMIN_CAP_ID> --json
```

**Success Criteria**:
- ✅ PlatformConfig initialized with correct testnet Cetus ID
- ✅ AdminCap owned by deployer
- ✅ All fee parameters set correctly

---

## Phase 3: Token Launch Testing

### 3.1 Create Bonding Curve
```bash
# Create a new token with bonding curve
# Parameters:
# - Token name: "TestCoin"
# - Symbol: "TEST"
# - Description: "Test token for SuiLFG"
# - Initial virtual SUI: 2.5 SUI
# - Initial virtual tokens: 1,073,000,000
```

**Test**:
```bash
# Use TypeScript SDK or PTB:
sui client call --package <PACKAGE_ID> \
  --module bonding_curve \
  --function create_curve \
  --args <PLATFORM_CONFIG_ID> "TestCoin" "TEST" "Test description" "https://test.com/image.png" \
  --gas-budget 100000000
```

**Expected Output**:
- BondingCurve object created
- CoinMetadata created
- TreasuryCap created
- CurveCreated event emitted

**Success Criteria**:
- ✅ Bonding curve created with correct parameters
- ✅ Initial reserves set correctly (2.5 SUI, 1.073B tokens)
- ✅ Creator address recorded
- ✅ Ticker registered in registry

---

### 3.2 Buy Tokens (Multiple Purchases)

**Test 1: Small Buy (0.1 SUI)**
```bash
sui client call --package <PACKAGE_ID> \
  --module bonding_curve \
  --function buy \
  --args <CURVE_ID> <COIN_0.1_SUI> <CLOCK_ID> \
  --gas-budget 100000000
```

**Expected**:
- Receive ~X tokens (calculate based on bonding curve formula)
- SUI reserve increases
- Token supply increases
- TokensPurchased event emitted

**Test 2: Medium Buy (1 SUI)**
**Test 3: Large Buy (5 SUI)**

**Success Criteria**:
- ✅ Tokens received match bonding curve calculations
- ✅ Reserves updated correctly
- ✅ No slippage protection issues
- ✅ Events emitted with correct data

---

### 3.3 Sell Tokens

**Test**: Sell 50% of purchased tokens
```bash
sui client call --package <PACKAGE_ID> \
  --module bonding_curve \
  --function sell \
  --args <CURVE_ID> <TOKEN_COIN> <CLOCK_ID> \
  --gas-budget 100000000
```

**Expected**:
- Receive SUI back (less than purchase due to curve)
- SUI reserve decreases
- Tokens burned
- TokensSold event emitted

**Success Criteria**:
- ✅ SUI received matches bonding curve
- ✅ Tokens burned correctly
- ✅ Reserves updated
- ✅ Cannot sell below minimum reserves

---

## Phase 4: Graduation & Cetus Pool Creation

### 4.1 Buy to Graduation Threshold
```bash
# Buy enough tokens to reach 13.333 SUI threshold
# This should trigger automatic graduation
```

**Expected Automatic Actions**:
1. Bonding curve graduates
2. Cetus CLMM pool created automatically
3. Liquidity seeded (10 SUI + remaining tokens)
4. LP Position NFT received
5. LP Position permanently locked in LockedLPPosition object
6. LockedLPPosition shared as public object

**Success Criteria**:
- ✅ Graduation triggered at exactly 13.333 SUI
- ✅ Cetus pool created on-chain
- ✅ Pool has correct liquidity (10 SUI + tokens)
- ✅ LP Position NFT locked permanently
- ✅ Platform takes 10% cut (1.333 SUI)
- ✅ Creator receives graduation payout (40 SUI)
- ✅ PoolCreated event emitted with pool details

**Verification Commands**:
```bash
# Check pool exists on Cetus
sui client object <POOL_ID> --json

# Check locked LP position
sui client object <LOCKED_LP_POSITION_ID> --json

# Verify is_permanently_locked = true
```

---

## Phase 5: LP Lock Verification

### 5.1 Verify Permanent Lock
```bash
# Check LockedLPPosition object
sui client object <LOCKED_LP_POSITION_ID> --json
```

**Verify**:
- `is_permanently_locked` = true
- `position` field contains Cetus Position NFT
- `fee_recipient` is set correctly
- Object is shared (anyone can read)

**Test**: Try to unlock (should be impossible)
- No unlock function exists in the module
- Position is trapped inside LockedLPPosition forever

**Success Criteria**:
- ✅ LP position is permanently locked
- ✅ No way to extract Position NFT
- ✅ is_permanently_locked flag is true
- ✅ Object is publicly verifiable (shared)

---

### 5.2 Collect LP Fees (Permissionless)
```bash
# Anyone can call this to send fees to recipient
sui client call --package <PACKAGE_ID> \
  --module lp_locker \
  --function collect_lp_fees \
  --args <LOCKED_LP_POSITION_ID> <CETUS_GLOBAL_CONFIG_ID> <POOL_ID> \
  --gas-budget 100000000
```

**Expected**:
- Fees collected from Cetus position
- Sent to fee_recipient address
- FeeCollected event emitted
- Position remains locked

**Success Criteria**:
- ✅ Fees collected successfully
- ✅ Sent to correct recipient
- ✅ Position still locked
- ✅ Can be called by anyone (permissionless)

---

### 5.3 Change Fee Recipient (Admin Only)
```bash
sui client call --package <PACKAGE_ID> \
  --module lp_locker \
  --function change_fee_recipient \
  --args <ADMIN_CAP_ID> <LOCKED_LP_POSITION_ID> <NEW_RECIPIENT> \
  --gas-budget 100000000
```

**Success Criteria**:
- ✅ Admin can change recipient
- ✅ Non-admin cannot change recipient
- ✅ RecipientChanged event emitted
- ✅ Position remains locked

---

## Phase 6: Referral System Testing

### 6.1 Register Referrer
```bash
# User A sets referrer to User B
sui client call --package <PACKAGE_ID> \
  --module referral_registry \
  --function register_referrer \
  --args <REGISTRY_ID> <REFERRER_ADDRESS> \
  --gas-budget 50000000
```

**Success Criteria**:
- ✅ Referrer registered
- ✅ Cannot refer self
- ✅ Cannot change referrer once set

---

### 6.2 Buy with Referral
```bash
# User A buys tokens (should trigger referral reward to User B)
sui client call --package <PACKAGE_ID> \
  --module bonding_curve \
  --function buy \
  --args <CURVE_ID> <COIN_SUI> <CLOCK_ID> \
  --gas-budget 100000000
```

**Expected**:
- User A receives tokens
- User B receives referral reward (% of fees)
- ReferralRewardPaid event emitted

**Success Criteria**:
- ✅ Referrer receives correct % of trading fees
- ✅ Referral reward paid in SUI
- ✅ Event records all details

---

## Phase 7: Edge Cases & Security

### 7.1 Slippage Protection
**Test**: Try to buy with max slippage exceeded
- Should abort transaction
- No state changes

### 7.2 Minimum Purchase/Sale
**Test**: Try to buy/sell 0 tokens
- Should fail with error

### 7.3 Graduation Protection
**Test**: Try to buy/sell after graduation
- Should fail (lp_seeded = true)

### 7.4 Reentrancy Protection
**Test**: Attempt reentrant calls
- Sui's object model prevents this

### 7.5 Integer Overflow/Underflow
**Test**: Extreme values
- Large purchases
- Large sales
- Should handle correctly or abort safely

---

## Phase 8: Gas Efficiency

### 8.1 Measure Gas Costs
Record gas used for each operation:
- Create curve: _____ gas
- Buy tokens: _____ gas
- Sell tokens: _____ gas
- Graduate: _____ gas
- Collect fees: _____ gas

---

## Final Checklist

### Functionality
- [ ] Contract deploys successfully
- [ ] Platform config initialized
- [ ] Can create bonding curves
- [ ] Buying works correctly
- [ ] Selling works correctly
- [ ] Graduation triggers at threshold
- [ ] Cetus pool created automatically
- [ ] LP position locked permanently
- [ ] Fees can be collected
- [ ] Referral system works

### Security
- [ ] No unlock mechanism for LP
- [ ] is_permanently_locked flag prevents future unlocks
- [ ] Slippage protection works
- [ ] Admin functions protected
- [ ] No reentrancy vulnerabilities
- [ ] Integer operations safe

### Events
- [ ] All events emit correct data
- [ ] Events can be indexed for UI

### Cetus Integration
- [ ] Pool created on Cetus testnet
- [ ] Liquidity visible on Cetus UI
- [ ] Trading works on Cetus
- [ ] LP fees accumulate
- [ ] Fees can be collected

---

## Test Results (To be filled)

### Deployment
- Package ID: `_____________`
- Transaction: `_____________`
- Timestamp: `_____________`

### Module IDs
- bonding_curve: `_____________`
- lp_locker: `_____________`
- platform_config: `_____________`
- ticker_registry: `_____________`
- referral_registry: `_____________`

### Test Objects Created
- PlatformConfig: `_____________`
- AdminCap: `_____________`
- Test BondingCurve: `_____________`
- Cetus Pool: `_____________`
- LockedLPPosition: `_____________`

### Test Results Summary
- Total Tests: ___
- Passed: ___
- Failed: ___
- Issues Found: ___

---

## Notes & Issues

(Document any issues, unexpected behavior, or improvements needed)

