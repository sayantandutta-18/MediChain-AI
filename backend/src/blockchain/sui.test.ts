import { suiClient } from "./sui.client.js";

const walletAddress =
  "0x10ed38387f3b5011ae39c50fc0031743c83d195a984d140c1c91eadc844f3f17";

async function testSuiConnection() {
  try {
    const chain = await suiClient.getChainIdentifier();

    console.log("✅ Sui Connected Successfully");
    console.log("Chain ID:", chain);

    const balance = await suiClient.core.getBalance({
      owner: walletAddress,
    });

    console.log("💰 Wallet Balance:", balance);
  } catch (error) {
    console.error("❌ Sui Test Failed:", error);
  }
}

testSuiConnection();