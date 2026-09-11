import crypto from "crypto";

export const generateSHA256 = (
  fileBuffer: Buffer
): string => {
  return crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");
};

export const verifySHA256 = (
  fileBuffer: Buffer,
  expectedHash: string
): boolean => {
  const currentHash = generateSHA256(fileBuffer);

  return currentHash === expectedHash;
};