import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
const mnemonic = 'royal stairs eye dizzy response educate fire edge smooth cruise skill say';
const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
const sender = keypair.getPublicKey().toSuiAddress();

console.log('Wallet:', sender, '\n');

// Check SUI
const sui = await client.getCoins({ owner: sender, coinType: '0x2::sui::SUI' });
const suiBalance = sui.data.reduce((sum, c) => sum + BigInt(c.balance), 0n);
console.log('SUI Balance:', Number(suiBalance) / 1e9, 'SUI');

// Check SUILFG_MEMEFI
const faucet = await client.getCoins({ 
  owner: sender, 
  coinType: '0x97daa9c97517343c1126e548e352fc4d13b2799a36dea0def4397cb3add5cb81::suilfg_memefi::SUILFG_MEMEFI' 
});
const faucetBalance = faucet.data.reduce((sum, c) => sum + BigInt(c.balance), 0n);
console.log('SUILFG_MEMEFI Balance:', Number(faucetBalance) / 1e9, 'tokens');
console.log('  Coins:', faucet.data.length);
