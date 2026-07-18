import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const CIPHER_ALGORITHM = "aes-256-gcm";
const CIPHER_PREFIX = "enc:v1";
const IV_BYTES = 12;

let cipherKey: Buffer | null = null;

// Key resolves lazily from process.env so non-api consumers can import this module without their env schema knowing about the key.
function getCipherKey(): Buffer {
  if (cipherKey) {
    return cipherKey;
  }
  const keyMaterial =
    process.env.SECRET_ENCRYPTION_KEY ?? process.env.BETTER_AUTH_SECRET;
  if (!keyMaterial) {
    throw new Error(
      "SECRET_ENCRYPTION_KEY or BETTER_AUTH_SECRET is required to use secret encryption"
    );
  }
  cipherKey = createHash("sha256").update(keyMaterial).digest();
  return cipherKey;
}

export const encryptSecret = (value: string): string => {
  if (value.startsWith(`${CIPHER_PREFIX}:`)) {
    return value;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER_ALGORITHM, getCipherKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${CIPHER_PREFIX}:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
};

export const decryptSecret = (value: string): string => {
  if (!value.startsWith(`${CIPHER_PREFIX}:`)) {
    return value;
  }

  const parts = value.split(":");
  if (parts.length !== 5 || parts[0] !== "enc" || parts[1] !== "v1") {
    throw new Error("Invalid encrypted secret format");
  }

  const ivPart = parts[2];
  const authTagPart = parts[3];
  const encryptedPart = parts[4];

  if (!(ivPart && authTagPart && encryptedPart)) {
    throw new Error("Invalid encrypted secret payload");
  }

  const iv = Buffer.from(ivPart, "base64");
  const authTag = Buffer.from(authTagPart, "base64");
  const encrypted = Buffer.from(encryptedPart, "base64");

  const decipher = createDecipheriv(CIPHER_ALGORITHM, getCipherKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8"
  );
};

export const decryptOptionalSecret = (
  value: string | null | undefined
): string | null | undefined => {
  if (value === null || value === undefined) {
    return value;
  }
  return decryptSecret(value);
};

type SecretFields = {
  secret: string;
  previousSecret?: string | null;
};

export const withDecryptedSecretFields = <T extends SecretFields>(
  row: T
): T => ({
  ...row,
  secret: decryptSecret(row.secret),
  previousSecret: decryptOptionalSecret(
    row.previousSecret
  ) as T["previousSecret"],
});
