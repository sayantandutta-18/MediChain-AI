import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const keypair = new Ed25519Keypair();

console.log("Sui Wallet Address:");
console.log(keypair.getPublicKey().toSuiAddress());

console.log("\nSui Private Key (SAVE THIS LOCALLY):");
console.log(keypair.getSecretKey());