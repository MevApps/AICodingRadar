import { describe, it, expect } from "vitest";
import { maskApiKey, isEncryptedKey } from "@/lib/settings";

describe("maskApiKey", () => {
  it("masks API key showing first 6 chars", () => {
    expect(maskApiKey("sk-ant-api03-secret-key-12345")).toBe("sk-ant...****");
  });
  it("handles short keys", () => {
    expect(maskApiKey("short")).toBe("short...****");
  });
  it("returns masked for empty string", () => {
    expect(maskApiKey("")).toBe("...****");
  });
});

describe("isEncryptedKey", () => {
  it("returns true for api_key settings", () => {
    expect(isEncryptedKey("anthropic_api_key")).toBe(true);
    expect(isEncryptedKey("openai_api_key")).toBe(true);
    expect(isEncryptedKey("gemini_api_key")).toBe(true);
  });
  it("returns false for other settings", () => {
    expect(isEncryptedKey("anthropic_model")).toBe(false);
    expect(isEncryptedKey("provider_priority")).toBe(false);
  });
});
