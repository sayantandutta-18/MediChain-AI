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

const ANCHOR_TYPE =
  `${PACKAGE_ID}::${MODULE_NAME}::MedicalRecordAnchor`;

const CLOCK_OBJECT_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000006";

// =====================================================
// HELPERS
// =====================================================

const normalizeHashValue = (
  value: unknown,
  expectedHash: string
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  // Already a normal SHA-256 hex string.
  if (typeof value === "string") {
    if (value === expectedHash) {
      return value;
    }

    if (/^[0-9a-fA-F]{64}$/.test(value)) {
      return value;
    }

    // Sui may represent vector<u8> as base64 in JSON.
    try {
      const decoded = Buffer.from(value, "base64").toString("utf8");

      if (
        decoded === expectedHash ||
        /^[0-9a-fA-F]{64}$/.test(decoded)
      ) {
        return decoded;
      }
    } catch {
      // Ignore invalid base64 and continue.
    }

    return value;
  }

  // JSON may expose vector<u8> as a number array.
  if (Array.isArray(value)) {
    if (
      value.length > 0 &&
      value.every((item) => typeof item === "number")
    ) {
      return Buffer.from(value as number[]).toString("utf8");
    }

    return undefined;
  }

  // Some serializers expose byte arrays as:
  // { "0": 97, "1": 50, ... }
  if (typeof value === "object") {
    const values = Object.values(value as Record<string, unknown>);

    if (
      values.length > 0 &&
      values.every((item) => typeof item === "number")
    ) {
      return Buffer.from(values as number[]).toString("utf8");
    }
  }

  return undefined;
};

const extractRecordHash = (
  object: any,
  expectedHash: string
): string | undefined => {
  const candidates = [
    object?.json?.record_hash,
    object?.json?.recordHash,
    object?.json?.fields?.record_hash,
    object?.json?.fields?.recordHash,

    object?.content?.fields?.record_hash,
    object?.content?.fields?.recordHash,

    object?.data?.content?.fields?.record_hash,
    object?.data?.content?.fields?.recordHash,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeHashValue(
      candidate,
      expectedHash
    );

    if (normalized !== undefined) {
      return normalized;
    }
  }

  return undefined;
};

// =====================================================
// STORE MEDICAL RECORD HASH ON SUI
// =====================================================

export const storeHashOnSui = async (
  recordHash: string,
  recordId: string,
  patientAddress: string
) => {
  const walletAddress =
    keypair.getPublicKey().toSuiAddress();

  const tx = new Transaction();

  tx.moveCall({
    target:
      `${PACKAGE_ID}::${MODULE_NAME}::${FUNCTION_NAME}`,

    arguments: [
      tx.pure.vector(
        "u8",
        Array.from(
          Buffer.from(recordId, "utf8")
        )
      ),

      tx.pure.vector(
        "u8",
        Array.from(
          Buffer.from(recordHash, "utf8")
        )
      ),

      tx.pure.address(patientAddress),

      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  const result =
    await suiClient.signAndExecuteTransaction({
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

  const transactionDigest =
    result.Transaction.digest;

  console.log(
    "⛓️ Sui Transaction Successful"
  );

  console.log(
    "🔗 Transaction Digest:",
    transactionDigest
  );

  console.log(
    "📄 Record ID:",
    recordId
  );

  console.log(
    "🔐 Record Hash:",
    recordHash
  );

  console.log(
    "👤 Patient:",
    patientAddress
  );

  // =====================================================
  // FIND CREATED MEDICAL RECORD OBJECT
  // =====================================================

  let blockchainObjectId:
    | string
    | undefined;

  try {
    const transaction =
      await suiClient.core.getTransaction({
        digest: transactionDigest,

        include: {
          effects: true,
        },
      });

    if (transaction.Transaction) {
      // IMPORTANT:
      // In Sui SDK v2, changedObjects is directly on
      // result.Transaction, NOT inside effects.
      const transactionData = JSON.parse(
        JSON.stringify(transaction.Transaction)
      );

      const changedObjects =
        transactionData?.changedObjects ??
        transactionData?.effects?.changedObjects ??
        [];

      console.log(
        "🔎 Changed Objects:",
        JSON.stringify(changedObjects, null, 2)
      );

      for (const changedObject of changedObjects) {
        const objectId =
          changedObject?.objectId;

        const idOperation =
          changedObject?.idOperation;

        if (!objectId) {
          continue;
        }

        // The anchor is the object CREATED by
        // create_record_anchor().
        if (idOperation === "Created") {
          blockchainObjectId = objectId;
          break;
        }
      }
    }
  } catch (objectError) {
    console.warn(
      "⚠️ Could not extract blockchain object ID:",
      objectError
    );
  }

  console.log(
    "🆔 Blockchain Object ID:",
    blockchainObjectId
  );

  // =====================================================
  // RETURN BLOCKCHAIN DATA
  // =====================================================

  return {
    transactionDigest,

    blockchainObjectId,

    packageId:
      PACKAGE_ID,

    network:
      process.env.SUI_NETWORK ||
      "testnet",

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
  try {
    // =====================================================
    // GET TRANSACTION
    // =====================================================

    const result =
      await suiClient.core.getTransaction({
        digest: transactionDigest,

        include: {
          effects: true,
        },
      });

    console.log(
      "🔎 SUI TRANSACTION DEBUG:",
      JSON.stringify(result.Transaction, null, 2)
    );

    // =====================================================
    // TRANSACTION FAILED
    // =====================================================

    if (result.FailedTransaction) {
      return {
        verified: false,
        reason:
          "Blockchain transaction failed",
      };
    }

    // =====================================================
    // TRANSACTION NOT FOUND
    // =====================================================

    if (!result.Transaction) {
      return {
        verified: false,
        reason:
          "Transaction not found",
      };
    }

    // =====================================================
    // FIND CREATED MEDICAL RECORD OBJECT
    // =====================================================

    // IMPORTANT:
    // Sui SDK v2 puts changedObjects directly on
    // result.Transaction.
    // Sui SDK v2 can expose changedObjects through the
    // transaction response, but the runtime response in this
    // project is not reliably enumerable through direct access.
    // Serialize first, then read the plain JSON representation.
    const transactionData = JSON.parse(
      JSON.stringify(result.Transaction)
    );

    const changedObjects =
      transactionData?.changedObjects ??
      transactionData?.effects?.changedObjects ??
      [];

    console.log(
      "🔎 SERIALIZED TRANSACTION KEYS:",
      Object.keys(transactionData)
    );

    console.log(
      "🔎 Changed Objects For Verification:",
      JSON.stringify(changedObjects, null, 2)
    );

    let blockchainObjectId:
      | string
      | undefined;

    for (const changedObject of changedObjects) {
      const objectId =
        changedObject?.objectId;

      const idOperation =
        changedObject?.idOperation;

      if (!objectId) {
        continue;
      }

      console.log(
        "🔎 Checking changed object:",
        {
          objectId,
          idOperation,
        }
      );

      // create_record_anchor creates exactly one new
      // MedicalRecordAnchor object in this transaction.
      if (idOperation === "Created") {
        blockchainObjectId = objectId;
        break;
      }
    }

    // =====================================================
    // OBJECT NOT FOUND
    // =====================================================

    if (!blockchainObjectId) {
      return {
        verified: false,

        transactionDigest:
          result.Transaction.digest,

        expectedRecordHash,

        reason:
          "MedicalRecordAnchor object not found in transaction",
      };
    }

    console.log(
      "🆔 Blockchain Object:",
      blockchainObjectId
    );

    // =====================================================
    // FETCH OBJECT CONTENT
    // =====================================================

    let objectResult: any;

    try {
      objectResult =
        await suiClient.core.getObject({
          objectId: blockchainObjectId,

          // Request BOTH representations.
          // content is reliable for Move fields;
          // json is useful as a fallback.
          include: {
            content: true,
            json: true,
          },
        });
    } catch (objectError) {
      console.error(
        "❌ Failed to fetch blockchain object:",
        objectError
      );

      return {
        verified: false,

        transactionDigest:
          result.Transaction.digest,

        blockchainObjectId,

        expectedRecordHash,

        reason:
          "Blockchain anchor object could not be fetched",
      };
    }

    console.log(
      "🔎 SUI OBJECT DEBUG:",
      JSON.stringify(objectResult, null, 2)
    );

    const object =
      objectResult?.object;

    if (!object) {
      return {
        verified: false,

        transactionDigest:
          result.Transaction.digest,

        blockchainObjectId,

        expectedRecordHash,

        reason:
          "Blockchain anchor object could not be fetched",
      };
    }

    // =====================================================
    // READ ON-CHAIN DATA
    // =====================================================

    console.log(
      "📦 On-chain object:",
      JSON.stringify(object, null, 2)
    );

    // =====================================================
    // EXTRACT RECORD HASH
    // =====================================================

    const onChainRecordHash =
      extractRecordHash(
        object,
        expectedRecordHash
      );

    console.log(
      "⛓️ Raw on-chain record_hash:",
      onChainRecordHash
    );

    // =====================================================
    // HASH NOT FOUND
    // =====================================================

    if (
      onChainRecordHash === undefined ||
      onChainRecordHash === null
    ) {
      return {
        verified: false,

        transactionDigest:
          result.Transaction.digest,

        blockchainObjectId,

        expectedRecordHash,

        reason:
          "record_hash was not found in blockchain object",
      };
    }

    // =====================================================
    // HASH COMPARISON
    // =====================================================

    const normalizedExpectedHash =
      String(expectedRecordHash)
        .trim()
        .toLowerCase();

    const normalizedOnChainHash =
      String(onChainRecordHash)
        .trim()
        .toLowerCase();

    const hashMatches =
      normalizedOnChainHash ===
      normalizedExpectedHash;

    console.log(
      "🔐 MongoDB Hash:",
      expectedRecordHash
    );

    console.log(
      "⛓️ On-chain Hash:",
      onChainRecordHash
    );

    console.log(
      hashMatches
        ? "✅ HASH MATCH"
        : "🚨 HASH MISMATCH"
    );

    // =====================================================
    // FINAL VERIFICATION RESULT
    // =====================================================

    return {
      verified: hashMatches,

      status:
        hashMatches
          ? "VERIFIED"
          : "TAMPERED",

      transactionDigest:
        result.Transaction.digest,

      blockchainObjectId,

      expectedRecordHash,

      onChainRecordHash,

      hashMatches,

      message:
        hashMatches
          ? "Medical record hash matches the hash stored on Sui blockchain"
          : "Medical record hash does not match the hash stored on Sui blockchain",
    };
  } catch (error: any) {
    console.error(
      "❌ Sui verification error:",
      error
    );

    return {
      verified: false,

      transactionDigest,

      expectedRecordHash,

      reason:
        error?.message ||
        "Unexpected blockchain verification error",
    };
  }
};
