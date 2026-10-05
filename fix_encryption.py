import re

with open('backend/src/utils/encryption.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'const resolveKey = \(\): Buffer => \{.*?\n\};'

replacement = """const keyCache = new Map<string, Buffer>();

const resolveKey = (version: string): Buffer => {
  if (keyCache.has(version)) return keyCache.get(version)!;

  const { keyHex, passphrase } = env.encryption;

  let key: Buffer;
  if (keyHex && version === env.encryption.keyVersion) {
    key = Buffer.from(keyHex, 'hex');
  } else {
    if (!passphrase) {
      throw ApiError.internal('Server encryption key is not configured.', 'ENCRYPTION_MISCONFIGURED');
    }
    // Deterministic 32 byte key derived from the passphrase and version
    key = scryptSync(passphrase, `medichain-ai.encryption.salt.${version}`, 32);
  }

  if (key.length !== 32) {
    throw ApiError.internal('Server encryption key must be 32 bytes.', 'ENCRYPTION_MISCONFIGURED');
  }

  keyCache.set(version, key);
  return key;
};"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)
content = content.replace("resolveKey()", "resolveKey(env.encryption.keyVersion)")
content = content.replace("resolveKey(env.encryption.keyVersion), iv);", "resolveKey(env.encryption.keyVersion), iv);")
content = content.replace("const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, resolveKey(env.encryption.keyVersion), Buffer.from(payload.iv, 'base64'));", "const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, resolveKey(payload.keyVersion), Buffer.from(payload.iv, 'base64'));")
content = content.replace("export const __resetKeyCache = (): void => {\n  cachedKey = null;\n};", "export const __resetKeyCache = (): void => {\n  keyCache.clear();\n};")

with open('backend/src/utils/encryption.ts', 'w', encoding='utf-8') as f:
    f.write(content)

