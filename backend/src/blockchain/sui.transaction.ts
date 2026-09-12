import "dotenv/config";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";

const client = new SuiGrpcClient({
  network: process.env.SUI_NETWORK || "testnet",
  baseUrl:
    process.env.SUI_RPC_URL ||
    "https://fullnode.testnet.sui.io:443",
});

const privateKey = process.env.SUI_PRIVATE_KEY;

if (!privateKey) {
  throw new Error("SUI_PRIVATE_KEY is missing in .env");
}

const keypair = Ed25519Keypair.fromSecretKey(privateKey);

async function testTransaction() {
  try {
    const walletAddress = keypair.getPublicKey().toSuiAddress();

    console.log("🔗 Sui Testnet");
    console.log("Wallet:", walletAddress);

    const tx = new Transaction();

    // Simple self-transfer: sends 0 SUI to the same wallet.
    tx.transferObjects(
      [tx.splitCoins(tx.gas, [0])],
      tx.pure.address(walletAddress)
    );

    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      include: {
        effects: true,
        balanceChanges: true,
      },
    });

    if (result.$kind === "FailedTransaction") {
      throw new Error(
        result.FailedTransaction.status.error?.message ||
          "Transaction failed"
      );
    }

    console.log("✅ Transaction Successful");
    console.log("Transaction Digest:", result.Transaction.digest);
    console.log(
      "Effects:",
      JSON.stringify(result.Transaction.effects, null, 2)
    );
  } catch (error) {
    console.error("❌ Transaction Failed:", error);
  }
}

testTransaction();