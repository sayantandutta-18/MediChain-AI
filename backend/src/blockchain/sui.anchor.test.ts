import "dotenv/config";
import { storeHashOnSui } from "./sui.service.js";

async function testAnchor() {
  try {
    const result = await storeHashOnSui(
      "test-sha256-hash-medichain-001",
      "test-record-001",
      "0x44b715f9ac21a6d7311510e065dfefcc41580e69eb80eb47e36d24338dd1a860"
    );

    console.log("✅ Medical Record Anchored Successfully");
    console.log("Transaction Digest:", result.transactionDigest);
    console.log("Wallet:", result.walletAddress);
    console.log("Record ID:", result.recordId);
    console.log("Record Hash:", result.recordHash);
    console.log("Patient:", result.patientAddress);
  } catch (error) {
    console.error("❌ Blockchain Anchor Failed:", error);
  }
}

testAnchor();