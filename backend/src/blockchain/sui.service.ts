import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { suiClient } from "./sui.client.js";

const privateKey = process.env.SUI_PRIVATE_KEY;

if (!privateKey) {
  throw new Error("SUI_PRIVATE_KEY is missing in .env");
}

const keypair = Ed25519Keypair.fromSecretKey(privateKey);

const PACKAGE_ID =
  "0x57c69fd3f040fa1a2746ff5ce45ff8644ef728d5737e76a725719f7492006526";

const MODULE_NAME = "medical_records";
const FUNCTION_NAME = "create_record_anchor";

export const storeHashOnSui = async (
  recordHash: string,
  recordId: string,
  patientAddress: string
) => {
  const walletAddress = keypair.getPublicKey().toSuiAddress();

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::${FUNCTION_NAME}`,

    arguments: [
      tx.pure.vector(
        "u8",
        Array.from(Buffer.from(recordId, "utf8"))
      ),

      tx.pure.vector(
        "u8",
        Array.from(Buffer.from(recordHash, "utf8"))
      ),

      tx.pure.address(patientAddress),

      tx.object(
        "0x0000000000000000000000000000000000000000000000000000000000000006"
      ),
    ],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,

    include: {
      effects: true,
      events: true,
    },
  });

  // =====================================================
  // CHECK TRANSACTION RESULT
  // =====================================================

  if (result.FailedTransaction) {
    throw new Error(
      result.FailedTransaction.status.error?.message ||
        "Sui transaction failed"
    );
  }

  if (!result.Transaction) {
    throw new Error(
      "Sui transaction did not return a transaction result"
    );
  }

  // =====================================================
  // TRANSACTION SUCCESS
  // =====================================================

  const transactionDigest = result.Transaction.digest;

  console.log("⛓️ Sui Transaction Successful");
  console.log("🔗 Transaction Digest:", transactionDigest);
  console.log("📄 Record ID:", recordId);
  console.log("🔐 Record Hash:", recordHash);
  console.log("👤 Patient:", patientAddress);

  // =====================================================
  // RETURN BLOCKCHAIN DATA
  // =====================================================

  return {
    transactionDigest,

    // Object ID will be added through
    // the blockchain verification/query flow.
    blockchainObjectId: undefined,

    packageId: PACKAGE_ID,

    network: process.env.SUI_NETWORK || "testnet",

    walletAddress,

    recordHash,

    recordId,

    patientAddress,
  };
};

// =========================================================
// VERIFY RECORD ON SUI BLOCKCHAIN
// =========================================================

export const verifyRecordOnSui = async (
  transactionDigest: string,
  expectedRecordHash: string
) => {
  const result = await suiClient.core.getTransaction({
    digest: transactionDigest,

    include: {
      effects: true,
      events: true,
    },
  });

  // =====================================================
  // TRANSACTION FAILED
  // =====================================================

  if (result.FailedTransaction) {
    return {
      verified: false,
      reason: "Blockchain transaction failed",
    };
  }

  // =====================================================
  // TRANSACTION NOT FOUND
  // =====================================================

  if (!result.Transaction) {
    return {
      verified: false,
      reason: "Transaction not found",
    };
  }

  // =====================================================
  // TRANSACTION EXISTS
  // =====================================================

  return {
    verified: true,
    transactionDigest: result.Transaction.digest,
    expectedRecordHash,
    message: "Transaction exists on Sui blockchain",
  };
};