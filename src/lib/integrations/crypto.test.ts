import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

beforeAll(() => {
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("encryptSecret/decryptSecret", () => {
  it("ida e volta", () => {
    const token = encryptSecret("1//refresh-token-xyz");
    expect(token.startsWith("v1.")).toBe(true);
    expect(token).not.toContain("refresh-token");
    expect(decryptSecret(token)).toBe("1//refresh-token-xyz");
  });

  it("IV aleatório: mesmo texto gera cifras diferentes", () => {
    expect(encryptSecret("a")).not.toBe(encryptSecret("a"));
  });

  it("adulteração é detectada (GCM)", () => {
    const [v, iv, tag, ct] = encryptSecret("segredo").split(".");
    const flipped = Buffer.from(ct, "base64url");
    flipped[0] ^= 1;
    expect(() => decryptSecret([v, iv, tag, flipped.toString("base64url")].join("."))).toThrow();
  });

  it("formato desconhecido é rejeitado", () => {
    expect(() => decryptSecret("v0.a.b.c")).toThrow();
  });
});
