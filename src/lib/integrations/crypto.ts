import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifra de segredos em repouso (refresh token do Google) com AES-256-GCM.
 * Chave: GOOGLE_TOKEN_ENCRYPTION_KEY = 32 bytes em base64
 * (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
 *
 * Formato: "v1.<iv>.<tag>.<ciphertext>" (base64url). O prefixo de versão
 * permite rotacionar algoritmo/chave no futuro sem quebrar o que já existe.
 */
const VERSION = "v1";

function getKey(): Buffer {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY não configurada");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY precisa ter 32 bytes (base64)");
  return key;
}

export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), ciphertext]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

export function decryptSecret(token: string): string {
  const [version, iv, tag, ciphertext] = token.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Segredo cifrado em formato desconhecido");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
