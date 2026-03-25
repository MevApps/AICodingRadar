# API Keys & Provider Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add encrypted API key management, multi-provider support (Anthropic/OpenAI/Gemini) with fallback chain, and a Settings admin page — so the curator can configure AI providers from the UI without touching env vars.

**Architecture:** Settings stored encrypted (AES-256-GCM) in a DB key-value table. An `AIProvider` interface abstracts all three providers behind `chat()` and `embed()` methods. `getProvider()` resolves the fallback chain from DB settings. Pipeline stages call the provider interface instead of Anthropic SDK directly. RunTracker uses dynamic pricing from the active provider.

**Tech Stack:** Next.js, Drizzle ORM, Node.js `crypto` (AES-256-GCM), `@anthropic-ai/sdk`, `openai`, `@google/generative-ai`

**Spec:** `docs/superpowers/specs/2026-03-25-api-keys-settings-design.md`

---

## Task 1: Settings DB Schema

**Files:**
- Modify: `src/lib/db/schema.ts`
- Test: `tests/lib/db/schema.test.ts`

- [ ] **Step 1: Write test for settings table**

Add to `tests/lib/db/schema.test.ts`:
```typescript
import { settings } from "@/lib/db/schema";

describe("settings schema", () => {
  it("has required columns", () => {
    const columns = Object.keys(settings);
    expect(columns).toContain("id");
    expect(columns).toContain("key");
    expect(columns).toContain("value");
    expect(columns).toContain("createdAt");
    expect(columns).toContain("updatedAt");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Add settings table to schema**

Add to `src/lib/db/schema.ts`:
```typescript
export const settings = pgTable(
  "settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("settings_key_idx").on(table.key),
  ]
);
```

- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Push schema**: `DATABASE_URL=postgresql://mevapps@localhost:5432/ai_coding_radar npx drizzle-kit push`
- [ ] **Step 6: Commit**: `feat: add settings table for API key storage`

---

## Task 2: Encryption Helpers

**Files:**
- Create: `src/lib/settings/encryption.ts`
- Test: `tests/lib/settings/encryption.test.ts`

- [ ] **Step 1: Write encryption tests**

Create `tests/lib/settings/encryption.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { encrypt, decrypt } from "@/lib/settings/encryption";

// Set test encryption key (32 bytes hex = 64 chars)
vi.stubEnv("SETTINGS_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");

describe("encryption", () => {
  it("encrypts and decrypts a string roundtrip", () => {
    const plaintext = "sk-ant-api03-secret-key-12345";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // base64
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
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement encryption**

Create `src/lib/settings/encryption.ts`:
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("SETTINGS_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, nonce);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // nonce (12) + ciphertext + tag (16)
  const combined = Buffer.concat([nonce, encrypted, tag]);
  return combined.toString("base64");
}

export function decrypt(encoded: string): string {
  const key = getKey();
  const combined = Buffer.from(encoded, "base64");

  const nonce = combined.subarray(0, NONCE_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const ciphertext = combined.subarray(NONCE_LENGTH, combined.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
```

- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Add to `.env.example` and `.env.local`**: `SETTINGS_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`
- [ ] **Step 6: Commit**: `feat: add AES-256-GCM encryption for settings`

---

## Task 3: Settings CRUD Module

**Files:**
- Create: `src/lib/settings/index.ts`
- Test: `tests/lib/settings/index.test.ts`

- [ ] **Step 1: Write settings CRUD tests**

Create `tests/lib/settings/index.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { maskApiKey, isEncryptedKey } from "@/lib/settings";

describe("maskApiKey", () => {
  it("masks API key showing first 6 chars", () => {
    expect(maskApiKey("sk-ant-api03-secret-key-12345")).toBe("sk-ant...****");
  });

  it("handles short keys", () => {
    expect(maskApiKey("short")).toBe("short...****");
  });

  it("returns empty for empty string", () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement settings module**

Create `src/lib/settings/index.ts`:
```typescript
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "./encryption";

export function isEncryptedKey(key: string): boolean {
  return key.endsWith("_api_key");
}

export function maskApiKey(value: string): string {
  const visible = value.slice(0, 6);
  return `${visible}...****`;
}

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  if (!row) return null;

  if (isEncryptedKey(key)) {
    return decrypt(row.value);
  }
  return row.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const storedValue = isEncryptedKey(key) ? encrypt(value) : value;

  await db
    .insert(settings)
    .values({ key, value: storedValue, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: storedValue, updatedAt: new Date() },
    });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};

  for (const row of rows) {
    if (isEncryptedKey(row.key)) {
      // Return masked version for API keys
      const decrypted = decrypt(row.value);
      result[row.key] = maskApiKey(decrypted);
    } else {
      result[row.key] = row.value;
    }
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**: `feat: add settings CRUD with encryption and masking`

---

## Task 4: AI Provider Interface & Implementations

**Files:**
- Create: `src/lib/ai/providers/types.ts`
- Create: `src/lib/ai/providers/anthropic.ts`
- Create: `src/lib/ai/providers/openai.ts`
- Create: `src/lib/ai/providers/gemini.ts`
- Create: `src/lib/ai/providers/index.ts`
- Test: `tests/lib/ai/providers/anthropic.test.ts`

- [ ] **Step 1: Install new dependencies**

```bash
npm install openai @google/generative-ai
```

- [ ] **Step 2: Create provider interface**

Create `src/lib/ai/providers/types.ts`:
```typescript
export interface ChatParams {
  system: string;
  message: string;
  maxTokens: number;
}

export interface ChatResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AIProvider {
  name: string;
  chat(params: ChatParams): Promise<ChatResult>;
  embed(texts: string[]): Promise<number[][]>;
  embedSingle(text: string): Promise<number[]>;
  validateKey(): Promise<boolean>;
  getInputPrice(): number;   // per token (not per million)
  getOutputPrice(): number;  // per token
}

// Pricing constants (per token)
export const PRICING = {
  anthropic: { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
  openai: { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
  gemini: { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
} as const;
```

- [ ] **Step 3: Write Anthropic provider test**

Create `tests/lib/ai/providers/anthropic.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "Hello" }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    },
  })),
}));

describe("AnthropicProvider", () => {
  it("returns chat result with token counts", async () => {
    const provider = new AnthropicProvider("test-key", "claude-sonnet-4-6");
    const result = await provider.chat({
      system: "You are helpful",
      message: "Hi",
      maxTokens: 100,
    });

    expect(result.text).toBe("Hello");
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(5);
  });

  it("has correct pricing", () => {
    const provider = new AnthropicProvider("test-key", "claude-sonnet-4-6");
    expect(provider.getInputPrice()).toBeCloseTo(3.0 / 1_000_000);
    expect(provider.getOutputPrice()).toBeCloseTo(15.0 / 1_000_000);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

- [ ] **Step 5: Implement Anthropic provider**

Create `src/lib/ai/providers/anthropic.ts`:
```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ChatParams, ChatResult } from "./types";
import { PRICING } from "./types";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = "claude-sonnet-4-6") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: "user", content: params.message }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return {
      text,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    // Anthropic doesn't have native embeddings — use Voyage AI (their recommended partner)
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (!voyageKey) {
      throw new Error("Anthropic embeddings require VOYAGE_API_KEY env var or use OpenAI/Gemini for embeddings.");
    }

    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${voyageKey}`,
      },
      body: JSON.stringify({ input: texts, model: "voyage-3-lite" }),
    });

    if (!response.ok) {
      throw new Error(`Voyage AI error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }

  async validateKey(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      });
      return true;
    } catch {
      return false;
    }
  }

  getInputPrice(): number { return PRICING.anthropic.input; }
  getOutputPrice(): number { return PRICING.anthropic.output; }
}
```

- [ ] **Step 6: Implement OpenAI provider**

Create `src/lib/ai/providers/openai.ts`:
```typescript
import OpenAI from "openai";
import type { AIProvider, ChatParams, ChatResult } from "./types";
import { PRICING } from "./types";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: params.maxTokens,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.message },
      ],
    });

    return {
      text: response.choices[0]?.message?.content ?? "",
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: 1024,
    });
    return response.data.map((d) => d.embedding);
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }

  async validateKey(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  getInputPrice(): number { return PRICING.openai.input; }
  getOutputPrice(): number { return PRICING.openai.output; }
}
```

- [ ] **Step 7: Implement Gemini provider**

Create `src/lib/ai/providers/gemini.ts`:
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, ChatParams, ChatResult } from "./types";
import { PRICING } from "./types";

export class GeminiProvider implements AIProvider {
  name = "gemini";
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-2.0-flash") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: params.system,
    });

    const result = await model.generateContent(params.message);
    const response = result.response;
    const text = response.text();
    const usage = response.usageMetadata;

    return {
      text,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
    const results: number[][] = [];

    for (const text of texts) {
      const result = await model.embedContent(text);
      // Pad or truncate to 1024 dimensions
      const embedding = result.embedding.values;
      const padded = new Array(1024).fill(0);
      for (let i = 0; i < Math.min(embedding.length, 1024); i++) {
        padded[i] = embedding[i];
      }
      results.push(padded);
    }

    return results;
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }

  async validateKey(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      await model.generateContent("hi");
      return true;
    } catch {
      return false;
    }
  }

  getInputPrice(): number { return PRICING.gemini.input; }
  getOutputPrice(): number { return PRICING.gemini.output; }
}
```

- [ ] **Step 8: Implement provider resolution with fallback**

Create `src/lib/ai/providers/index.ts`:
```typescript
import { getSetting } from "@/lib/settings";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import type { AIProvider, ChatParams, ChatResult } from "./types";

export type { AIProvider, ChatParams, ChatResult } from "./types";

function createProvider(name: string, apiKey: string, model?: string): AIProvider {
  switch (name) {
    case "anthropic":
      return new AnthropicProvider(apiKey, model ?? "claude-sonnet-4-6");
    case "openai":
      return new OpenAIProvider(apiKey, model ?? "gpt-4o");
    case "gemini":
      return new GeminiProvider(apiKey, model ?? "gemini-2.0-flash");
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export async function getProvider(): Promise<AIProvider> {
  const priorityJson = await getSetting("provider_priority");
  const ordered = priorityJson ? JSON.parse(priorityJson) : ["anthropic", "openai", "gemini"];

  for (const name of ordered) {
    const key = await getSetting(`${name}_api_key`);
    if (key) {
      const model = await getSetting(`${name}_model`);
      return createProvider(name, key, model ?? undefined);
    }
  }

  // Fallback: check env vars
  if (process.env.ANTHROPIC_API_KEY) {
    return createProvider("anthropic", process.env.ANTHROPIC_API_KEY);
  }
  if (process.env.OPENAI_API_KEY) {
    return createProvider("openai", process.env.OPENAI_API_KEY);
  }

  throw new Error("No AI provider configured. Add an API key in Settings.");
}

export async function getEmbeddingProvider(): Promise<AIProvider> {
  const embeddingProviderName = await getSetting("embedding_provider");

  if (embeddingProviderName) {
    const key = await getSetting(`${embeddingProviderName}_api_key`);
    if (key) {
      const model = await getSetting(`${embeddingProviderName}_model`);
      return createProvider(embeddingProviderName, key, model ?? undefined);
    }
  }

  // Fallback: use first provider that supports embeddings (OpenAI preferred)
  for (const name of ["openai", "gemini"]) {
    const key = await getSetting(`${name}_api_key`);
    if (key) {
      return createProvider(name, key);
    }
  }

  // Last resort: if Anthropic key is available (env or DB) and VOYAGE_API_KEY is set,
  // Anthropic provider can use Voyage for embeddings
  const anthropicKey = await getSetting("anthropic_api_key") ?? process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && process.env.VOYAGE_API_KEY) {
    return createProvider("anthropic", anthropicKey);
  }

  throw new Error("No embedding provider configured. Add an OpenAI or Gemini key in Settings.");
}

export async function chatWithFallback(
  params: ChatParams,
  onUsage?: (usage: { inputTokens: number; outputTokens: number }, provider: AIProvider) => void
): Promise<ChatResult> {
  const priorityJson = await getSetting("provider_priority");
  const ordered = priorityJson ? JSON.parse(priorityJson) : ["anthropic", "openai", "gemini"];

  const errors: string[] = [];

  for (const name of ordered) {
    const key = await getSetting(`${name}_api_key`);
    if (!key) continue;

    try {
      const model = await getSetting(`${name}_model`);
      const provider = createProvider(name, key, model ?? undefined);
      const result = await provider.chat(params);

      if (onUsage) {
        onUsage(
          { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
          provider
        );
      }

      return result;
    } catch (error) {
      errors.push(`${name}: ${(error as Error).message}`);
    }
  }

  // Env var fallback
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const provider = createProvider("anthropic", process.env.ANTHROPIC_API_KEY);
      const result = await provider.chat(params);
      if (onUsage) {
        onUsage(
          { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
          provider
        );
      }
      return result;
    } catch (error) {
      errors.push(`anthropic (env): ${(error as Error).message}`);
    }
  }

  throw new Error(`All providers failed: ${errors.join("; ")}`);
}
```

- [ ] **Step 9: Run tests to verify Anthropic provider test passes**

```bash
npx vitest run tests/lib/ai/providers/
```

- [ ] **Step 10: Commit**: `feat: add multi-provider AI abstraction with fallback chain`

---

## Task 5: Refactor Pipeline to Use Provider Interface

**Files:**
- Modify: `src/lib/ingestion/relevance-filter.ts`
- Modify: `src/lib/ingestion/structurer.ts`
- Modify: `src/lib/ingestion/supersession.ts`
- Modify: `src/lib/ingestion/tracker.ts`
- Modify: `src/lib/embeddings/client.ts`
- Modify: `src/lib/ai/client.ts`
- Modify: `src/app/api/feed/summary/route.ts`

- [ ] **Step 1: Update RunTracker for dynamic pricing**

Replace `src/lib/ingestion/tracker.ts`:
```typescript
import type { AIProvider } from "@/lib/ai/providers/types";

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

interface AccumulatedUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export class RunTracker {
  private inputTokens = 0;
  private outputTokens = 0;
  private costUsd = 0;

  recordUsage(usage: TokenUsage, provider?: AIProvider): void {
    this.inputTokens += usage.inputTokens;
    this.outputTokens += usage.outputTokens;
    if (provider) {
      this.costUsd +=
        usage.inputTokens * provider.getInputPrice() +
        usage.outputTokens * provider.getOutputPrice();
    } else {
      // Fallback to Anthropic Sonnet pricing
      this.costUsd +=
        usage.inputTokens * (3.0 / 1_000_000) +
        usage.outputTokens * (15.0 / 1_000_000);
    }
  }

  getUsage(): AccumulatedUsage {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      costUsd: this.costUsd,
    };
  }

  checkBudget(currentMonthSpend: number, budgetCap: number): boolean {
    return currentMonthSpend + this.costUsd <= budgetCap;
  }
}
```

- [ ] **Step 2: Update relevance-filter.ts to use provider**

Replace `src/lib/ingestion/relevance-filter.ts`:
```typescript
import { chatWithFallback } from "@/lib/ai/providers";
import { RELEVANCE_FILTER_PROMPT } from "@/lib/ai/prompts";
import type { RunTracker } from "./tracker";

interface RelevanceResult {
  score: number;
  reason: string;
}

export async function filterRelevance(
  item: { title: string; content: string },
  tracker?: RunTracker
): Promise<RelevanceResult> {
  const result = await chatWithFallback(
    {
      system: RELEVANCE_FILTER_PROMPT,
      message: `Title: ${item.title}\n\nContent: ${item.content}`,
      maxTokens: 256,
    },
    tracker
      ? (usage, provider) => tracker.recordUsage(usage, provider)
      : undefined
  );

  const parsed = JSON.parse(result.text);
  return { score: parsed.score, reason: parsed.reason };
}
```

- [ ] **Step 3: Update structurer.ts to use provider**

Replace `src/lib/ingestion/structurer.ts`:
```typescript
import { chatWithFallback } from "@/lib/ai/providers";
import { STRUCTURER_PROMPT } from "@/lib/ai/prompts";
import type { EntryType } from "@/types";
import type { RunTracker } from "./tracker";

interface StructuredEntry {
  type: EntryType;
  title: string;
  summary: string;
  body: string;
  tools: string[];
  categories: string[];
}

export async function structureEntry(
  item: { title: string; content: string },
  tracker?: RunTracker
): Promise<StructuredEntry> {
  const result = await chatWithFallback(
    {
      system: STRUCTURER_PROMPT,
      message: `Title: ${item.title}\n\nContent: ${item.content}`,
      maxTokens: 2048,
    },
    tracker
      ? (usage, provider) => tracker.recordUsage(usage, provider)
      : undefined
  );

  return JSON.parse(result.text);
}
```

- [ ] **Step 4: Update supersession.ts checkSupersession to use provider**

Replace the `checkSupersession` function in `src/lib/ingestion/supersession.ts` (keep `findSupersessionCandidates` unchanged):
```typescript
import { chatWithFallback } from "@/lib/ai/providers";
import { SUPERSESSION_PROMPT } from "@/lib/ai/prompts";
import type { RunTracker } from "./tracker";

interface SupersessionResult {
  supersedes: boolean;
  reason: string;
}

export async function checkSupersession(
  newEntry: { title: string; body: string },
  existingEntry: { title: string; body: string },
  tracker?: RunTracker
): Promise<SupersessionResult> {
  const result = await chatWithFallback(
    {
      system: SUPERSESSION_PROMPT,
      message: `NEW ENTRY:\nTitle: ${newEntry.title}\nBody: ${newEntry.body}\n\nEXISTING ENTRY:\nTitle: ${existingEntry.title}\nBody: ${existingEntry.body}`,
      maxTokens: 512,
    },
    tracker
      ? (usage, provider) => tracker.recordUsage(usage, provider)
      : undefined
  );

  return JSON.parse(result.text);
}

// findSupersessionCandidates stays exactly as-is
```

- [ ] **Step 5: Update embeddings client to use provider**

Replace `src/lib/embeddings/client.ts`:
```typescript
import { getEmbeddingProvider } from "@/lib/ai/providers";

export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = await getEmbeddingProvider();
  return provider.embedSingle(text);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const provider = await getEmbeddingProvider();
  return provider.embed(texts);
}
```

- [ ] **Step 6: Update ai/client.ts as backwards-compat wrapper**

Replace `src/lib/ai/client.ts`:
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "@/lib/settings";

let client: Anthropic | null = null;

export async function getAnthropicClient(): Promise<Anthropic> {
  if (!client) {
    const key = await getSetting("anthropic_api_key") ?? process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("No Anthropic API key configured");
    client = new Anthropic({ apiKey: key });
  }
  return client;
}
```

Note: This function is now async. Callers that used it synchronously (feed summary route) need to be updated.

- [ ] **Step 7: Update feed summary route to use provider**

Replace `src/app/api/feed/summary/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entries } from "@/lib/db/schema";
import { and, eq, gt, desc } from "drizzle-orm";
import { chatWithFallback } from "@/lib/ai/providers";

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get("since");

  if (!since) {
    return NextResponse.json({ summary: null });
  }

  const sinceDate = new Date(since);

  const recentEntries = await db
    .select({ title: entries.title, type: entries.type, tools: entries.tools })
    .from(entries)
    .where(
      and(
        eq(entries.status, "active"),
        eq(entries.confidence, "verified"),
        gt(entries.publishedAt, sinceDate)
      )
    )
    .orderBy(desc(entries.publishedAt))
    .limit(10);

  if (recentEntries.length === 0) {
    return NextResponse.json({ summary: null });
  }

  const result = await chatWithFallback({
    system: "You are a helpful assistant that summarizes AI coding tool updates.",
    message: `Summarize these recent AI coding tool updates in 2-3 concise sentences for a tech lead. Be specific about tools and changes:\n\n${recentEntries.map((e) => `- [${e.type}] ${e.title} (${e.tools.join(", ")})`).join("\n")}`,
    maxTokens: 256,
  });

  return NextResponse.json({ summary: result.text, count: recentEntries.length });
}
```

- [ ] **Step 8: Update existing tests to mock new provider interface**

The existing tests mock `@/lib/ai/client` which is no longer used. Update all three test files:

Update `tests/lib/ingestion/relevance-filter.test.ts` — replace the mock:
```typescript
vi.mock("@/lib/ai/providers", () => ({
  chatWithFallback: vi.fn().mockResolvedValue({
    text: '{"score": 0.9, "reason": "Directly about AI coding tools"}',
    inputTokens: 10,
    outputTokens: 5,
  }),
}));
```

Update `tests/lib/ingestion/structurer.test.ts` — replace the mock:
```typescript
vi.mock("@/lib/ai/providers", () => ({
  chatWithFallback: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      type: "tip",
      title: "Claude Code Background Agents",
      summary: "Claude Code now supports background agents for running tasks.",
      body: "Full guide on using background agents...",
      tools: ["Claude Code"],
      categories: ["Code Generation"],
    }),
    inputTokens: 10,
    outputTokens: 50,
  }),
}));
```

Update `tests/lib/ingestion/supersession.test.ts` — replace the mock:
```typescript
vi.mock("@/lib/ai/providers", () => ({
  chatWithFallback: vi.fn().mockResolvedValue({
    text: '{"supersedes": true, "reason": "New entry provides updated information"}',
    inputTokens: 10,
    outputTokens: 5,
  }),
}));
```

Also update `tests/lib/ingestion/pipeline.test.ts` — the pipeline test mocks `relevance-filter`, `structurer`, and `supersession` at module level, which still works since the pipeline imports those modules. No change needed for pipeline test.

- [ ] **Step 9: Run all tests**

```bash
npx vitest run
# Expected: ALL PASS
```

- [ ] **Step 10: Commit**: `refactor: migrate pipeline from Anthropic SDK to multi-provider interface`

---

## Task 6: Settings API Routes

**Files:**
- Create: `src/app/api/admin/settings/route.ts`
- Create: `src/app/api/admin/settings/[key]/route.ts`
- Create: `src/app/api/admin/settings/validate/route.ts`

- [ ] **Step 1: Implement settings GET/PUT**

Create `src/app/api/admin/settings/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/settings";

export async function GET() {
  const settings = await getAllSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const { key, value } = await request.json();

  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  await setSetting(key, value);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Implement settings DELETE**

Create `src/app/api/admin/settings/[key]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { deleteSetting } from "@/lib/settings";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  await deleteSetting(key);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Implement validate endpoint**

Create `src/app/api/admin/settings/validate/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { GeminiProvider } from "@/lib/ai/providers/gemini";

export async function POST(request: NextRequest) {
  const { provider: providerName } = await request.json();

  const key = await getSetting(`${providerName}_api_key`);
  if (!key) {
    return NextResponse.json({ valid: false, error: "No API key configured" });
  }

  const model = await getSetting(`${providerName}_model`);

  try {
    let provider;
    switch (providerName) {
      case "anthropic":
        provider = new AnthropicProvider(key, model ?? undefined);
        break;
      case "openai":
        provider = new OpenAIProvider(key, model ?? undefined);
        break;
      case "gemini":
        provider = new GeminiProvider(key, model ?? undefined);
        break;
      default:
        return NextResponse.json({ valid: false, error: "Unknown provider" });
    }

    const valid = await provider.validateKey();
    return NextResponse.json({ valid });
  } catch (error) {
    return NextResponse.json({ valid: false, error: (error as Error).message });
  }
}
```

- [ ] **Step 4: Commit**: `feat: add settings API routes for provider management`

---

## Task 7: Settings Page UI

**Files:**
- Create: `src/components/admin/provider-card.tsx`
- Create: `src/components/admin/provider-priority.tsx`
- Create: `src/components/admin/settings-form.tsx`
- Create: `src/app/admin/settings/page.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create ProviderCard component**

Create `src/components/admin/provider-card.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const MODEL_OPTIONS: Record<string, string[]> = {
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-6"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  gemini: ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash"],
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

interface ProviderCardProps {
  provider: string;
  maskedKey: string | null;
  model: string;
  onSaveKey: (key: string) => Promise<void>;
  onSaveModel: (model: string) => Promise<void>;
  onValidate: () => Promise<boolean>;
}

export function ProviderCard({
  provider,
  maskedKey,
  model,
  onSaveKey,
  onSaveModel,
  onValidate,
}: ProviderCardProps) {
  const [editing, setEditing] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<boolean | null>(null);

  const isConfigured = maskedKey !== null;
  const statusColor = validationResult === true
    ? "bg-emerald-500"
    : validationResult === false
      ? "bg-red-500"
      : isConfigured
        ? "bg-emerald-500"
        : "bg-gray-300";
  const statusText = validationResult === true
    ? "Connected"
    : validationResult === false
      ? "Invalid"
      : isConfigured
        ? "Configured"
        : "Not configured";

  async function handleSave() {
    setSaving(true);
    await onSaveKey(keyInput);
    setSaving(false);
    setEditing(false);
    setKeyInput("");
    setValidationResult(null);
  }

  async function handleValidate() {
    setValidating(true);
    const valid = await onValidate();
    setValidationResult(valid);
    setValidating(false);
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
          <span className="font-semibold">{PROVIDER_LABELS[provider]}</span>
          <span className="text-xs text-gray-400">{statusText}</span>
        </div>
      </div>

      {/* API Key */}
      <div className="mb-3">
        <label className="text-xs text-gray-500">API Key</label>
        {editing ? (
          <div className="flex gap-2 mt-1">
            <Input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste API key..."
            />
            <Button size="sm" onClick={handleSave} disabled={saving || !keyInput}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono text-gray-600">
              {maskedKey ?? "Not set"}
            </span>
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              {isConfigured ? "Edit" : "Add"}
            </Button>
            {isConfigured && (
              <Button size="sm" variant="secondary" onClick={handleValidate} disabled={validating}>
                {validating ? "Testing..." : "Test"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Model */}
      <div>
        <label className="text-xs text-gray-500">Model</label>
        <select
          value={model}
          onChange={(e) => onSaveModel(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          {(MODEL_OPTIONS[provider] ?? []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Create ProviderPriority component**

Create `src/components/admin/provider-priority.tsx`:
```tsx
"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

interface ProviderPriorityProps {
  priority: string[];
  configuredProviders: Set<string>;
  embeddingProvider: string;
  onReorder: (newOrder: string[]) => void;
  onEmbeddingChange: (provider: string) => void;
}

export function ProviderPriority({
  priority,
  configuredProviders,
  embeddingProvider,
  onReorder,
  onEmbeddingChange,
}: ProviderPriorityProps) {
  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...priority];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onReorder(next);
  }

  function moveDown(index: number) {
    if (index === priority.length - 1) return;
    const next = [...priority];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onReorder(next);
  }

  const embeddingOptions = priority.filter(
    (p) => configuredProviders.has(p) && p !== "anthropic"
  );

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Provider Priority</h3>
      <p className="text-xs text-gray-500 mb-3">
        Providers are tried in order. Unconfigured providers are skipped.
      </p>

      <div className="space-y-2 mb-4">
        {priority.map((name, i) => (
          <div
            key={name}
            className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
              configuredProviders.has(name) ? "border-gray-200" : "border-gray-100 text-gray-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-4">{i + 1}.</span>
              <span
                className={`h-2 w-2 rounded-full ${
                  configuredProviders.has(name) ? "bg-emerald-500" : "bg-gray-300"
                }`}
              />
              <span>{PROVIDER_LABELS[name]}</span>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveUp(i)}
                disabled={i === 0}
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => moveDown(i)}
                disabled={i === priority.length - 1}
              >
                ↓
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs text-gray-500">Embedding Provider</label>
        <select
          value={embeddingProvider}
          onChange={(e) => onEmbeddingChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          {embeddingOptions.length === 0 && (
            <option value="">Configure OpenAI or Gemini first</option>
          )}
          {embeddingOptions.map((p) => (
            <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          Anthropic doesn't support embeddings directly — use OpenAI or Gemini.
        </p>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create SettingsForm container**

Create `src/components/admin/settings-form.tsx`:
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { ProviderCard } from "./provider-card";
import { ProviderPriority } from "./provider-priority";

const PROVIDERS = ["anthropic", "openai", "gemini"];
const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  gemini: "gemini-2.0-flash",
};

export function SettingsForm() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setSettings(data.settings);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function saveSetting(key: string, value: string) {
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    fetchSettings();
  }

  async function validateProvider(provider: string): Promise<boolean> {
    const res = await fetch("/api/admin/settings/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    return data.valid;
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading settings...</p>;
  }

  const priority = settings.provider_priority
    ? JSON.parse(settings.provider_priority)
    : ["anthropic", "openai", "gemini"];

  const configuredProviders = new Set(
    PROVIDERS.filter((p) => settings[`${p}_api_key`])
  );

  const embeddingProvider = settings.embedding_provider ?? "openai";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">API Keys</h2>
        <div className="space-y-4">
          {PROVIDERS.map((provider) => (
            <ProviderCard
              key={provider}
              provider={provider}
              maskedKey={settings[`${provider}_api_key`] ?? null}
              model={settings[`${provider}_model`] ?? DEFAULT_MODELS[provider]}
              onSaveKey={(key) => saveSetting(`${provider}_api_key`, key)}
              onSaveModel={(model) => saveSetting(`${provider}_model`, model)}
              onValidate={() => validateProvider(provider)}
            />
          ))}
        </div>
      </div>

      <ProviderPriority
        priority={priority}
        configuredProviders={configuredProviders}
        embeddingProvider={embeddingProvider}
        onReorder={(order) =>
          saveSetting("provider_priority", JSON.stringify(order))
        }
        onEmbeddingChange={(provider) =>
          saveSetting("embedding_provider", provider)
        }
      />
    </div>
  );
}
```

- [ ] **Step 4: Create Settings page**

Create `src/app/admin/settings/page.tsx`:
```tsx
import { SettingsForm } from "@/components/admin/settings-form";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <SettingsForm />
    </div>
  );
}
```

- [ ] **Step 5: Add Settings link to admin nav**

Modify `src/app/admin/layout.tsx` — add a link between Sources and View Feed:
```tsx
<Link href="/admin/settings" className="text-sm text-gray-600 hover:text-black">
  Settings
</Link>
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
# Expected: ALL PASS
```

- [ ] **Step 7: Commit**: `feat: add Settings page with provider cards, priority, and embedding config`

---

## Task 8: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Push schema**

```bash
DATABASE_URL=postgresql://mevapps@localhost:5432/ai_coding_radar npx drizzle-kit push
```

- [ ] **Step 4: Verify dev server**

```bash
npm run dev
# Navigate to localhost:3000/admin/settings — Settings page renders
# Add an API key, test it, reorder providers
```

- [ ] **Step 5: Push to GitHub**

```bash
git push origin master
```
