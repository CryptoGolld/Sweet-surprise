import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const keypair = Ed25519Keypair.generate();
const privateKey = keypair.getSecretKey();
const address = keypair.getPublicKey().toSuiAddress();

console.log('Private Key:', privateKey);
console.log('Address:', address);
