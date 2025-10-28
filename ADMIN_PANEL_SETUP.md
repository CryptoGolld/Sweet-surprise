# Admin Panel Setup Guide

## What Was Created

A secure admin panel at `/admin` that allows you to manage platform configuration without using CLI commands.

## Features

✅ **Platform Fee Management** - Update trading fees
✅ **Referral Rewards** - Configure referral percentages  
✅ **Platform Controls** - Pause/unpause trading
✅ **Password Protection** - Simple authentication
✅ **Wallet Verification** - Only admin wallets can execute

## Setup Steps

### 1. Add Admin Wallet Addresses

Edit `/app/admin/page.tsx` line 13:

```typescript
const ADMIN_ADDRESSES = [
  '0xYOUR_WALLET_ADDRESS_HERE',
  // Add more admin addresses as needed
];
```

### 2. Set Admin Password (Optional)

Add to your `.env.local`:

```bash
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password_here
```

Or it defaults to `admin123` (change in production!)

### 3. Add AdminCap Object ID

Edit `/lib/constants.ts` and add your AdminCap object ID:

```typescript
ADMIN_CAP: '0xYOUR_ADMIN_CAP_OBJECT_ID',
```

To find your AdminCap object ID:
```bash
# List objects in your wallet
sui client objects

# Look for AdminCap object
```

### 4. Deploy

```bash
git add .
git commit -m "feat: Add admin panel"
git push
```

Vercel will auto-deploy.

## How to Use

1. **Go to** `https://yourapp.vercel.app/admin`

2. **Enter password** (default: `admin123`)

3. **Connect your admin wallet**

4. **Execute commands:**
   - Update platform fee (e.g., 1 = 1%)
   - Update referral percent (e.g., 5 = 5%)
   - Pause/unpause platform

## Security Notes

⚠️ **Important:**
- Change the default password in production
- Only add trusted wallet addresses to ADMIN_ADDRESSES
- Keep your AdminCap object safe
- The page is publicly accessible but commands require:
  1. Correct password
  2. Admin wallet address
  3. AdminCap object in wallet

## Troubleshooting

### "Your wallet address is not authorized"
- Add your wallet address to `ADMIN_ADDRESSES` array

### "AdminCap not found"
- Add the correct AdminCap object ID to `CONTRACTS.ADMIN_CAP`
- Make sure the AdminCap is in your connected wallet

### Transaction fails
- Check if the Move functions match your contract
- Verify you have the AdminCap object
- Check gas balance

## Alternative: Keep Using CLI

If you prefer CLI commands, you can still use:

```bash
sui client call --package $PACKAGE \
  --module platform \
  --function update_fee_percent \
  --args $PLATFORM_STATE $ADMIN_CAP 100 \
  --gas-budget 10000000
```

The admin panel just makes it easier! 🎉
