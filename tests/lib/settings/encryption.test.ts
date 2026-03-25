import { describe, it, expect, vi } from "vitest";
import { encrypt, decrypt } from "@/lib/settings/encryption";

vi.stubEnv("SETTINGS_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");

describe("encryption", () => {
  it("encrypts and decrypts a string roundtrip", () => {
    const plaintext = "sk-ant-api03-secret-key-12345";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same plaintext (random nonce)", () => {
    const plaintext = "sk-ant-api03-secret-key-12345";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("secret");
    const tampered = encrypted.slice(0, -4) + "XXXX";
    expect(() => decrypt(tampered)).toThrow();
  });
});
