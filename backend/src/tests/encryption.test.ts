import "dotenv/config";

import {
  encryptFile,
  decryptFile,
} from "../services/encryption.service.js";

const originalText = "MediChain encryption test";

const originalBuffer = Buffer.from(originalText, "utf-8");

const encrypted = encryptFile(originalBuffer);

console.log("🔐 Original:", originalText);
console.log("🔒 Encrypted:", encrypted.encryptedData.toString("hex"));
console.log("🧩 IV:", encrypted.iv);
console.log("🏷️ Auth Tag:", encrypted.authTag);

const decrypted = decryptFile(
  encrypted.encryptedData,
  encrypted.iv,
  encrypted.authTag
);

console.log(
  "🔓 Decrypted:",
  decrypted.toString("utf-8")
);

if (decrypted.toString("utf-8") === originalText) {
  console.log("✅ Encryption/Decryption test PASSED");
} else {
  console.log("❌ Encryption/Decryption test FAILED");
}