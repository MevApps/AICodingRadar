# API Keys & Provider Settings — Design Spec

## Overview

Add a Settings page to the admin panel for managing AI provider API keys and configuring provider priority. Keys are stored encrypted in the database — no env vars needed for AI providers. The ingestion pipeline uses a fallback chain: try the primary provider, fall back to the next if it fails or budget is exceeded.

## Data Model

### Settings Table

```
Settings {
  id: UUID
  key: text (unique)    -- e.g., "anthropic_api_key", "provider_priority"
  value: text           -- encrypted for API keys, plain for config
  createdAt: timestamp
  updatedAt: timestamp
}
```

Key-value store pattern — simple, extensible, no schema changes when adding new settings.

### Encryption

API keys are encrypted using AES-256-GCM before storing in the database.

- **Key derivation**: `SETTINGS_ENCRYPTION_KEY` env var (32-byte hex string, the only secret that must stay in env)
- **Nonce**: random 12-byte IV generated per encryption, prepended to the ciphertext
- **Storage format**: `base64(nonce + ciphertext + authTag)` — a single string column
- **Decryption**: split the stored value back into nonce (first 12 bytes), auth tag (last 16 bytes), and ciphertext

On read, keys are decrypted server-side and never sent to the client in full — only masked versions (first 6 chars + `...****`).

### Settings Keys

| Key | Value | Description |
|-----|-------|-------------|
| `anthropic_api_key` | encrypted | Anthropic API key |
| `anthropic_model` | plain | Model name (default: `claude-sonnet-4-6`) |
| `openai_api_key` | encrypted | OpenAI API key |
| `openai_model` | plain | Model name (default: `gpt-4o`) |
| `gemini_api_key` | encrypted | Google Gemini API key |
| `gemini_model` | plain | Model name (default: `gemini-2.0-flash`) |
| `provider_priority` | plain JSON | Ordered array: `["anthropic", "openai", "gemini"]` |
| `embedding_provider` | plain | Which provider for embeddings: `anthropic`, `openai`, or `gemini` |

## Provider Abstraction

### AI Provider Interface

```typescript
interface AIProvider {
  name: string;
  chat(params: { system: string; message: string; maxTokens: number }):
    Promise<{ text: string; inputTokens: number; outputTokens: number }>;
  embed(texts: string[]): Promise<number[][]>;
  embedSingle(text: string): Promise<number[]>;
  validateKey(): Promise<boolean>;
  getInputPrice(): number;   // price per 1M input tokens
  getOutputPrice(): number;  // price per 1M output tokens
}
```

Three implementations:
- `AnthropicProvider` — uses `@anthropic-ai/sdk`, embeddings via `voyage-3-lite` compatible endpoint. **Pricing**: input $3/M, output $15/M (Sonnet).
- `OpenAIProvider` — uses `openai` SDK, embeddings via `text-embedding-3-small` (1536 dimensions). **Pricing**: input $2.50/M, output $10/M (GPT-4o).
- `GeminiProvider` — uses `@google/generative-ai` SDK, embeddings via `text-embedding-004` (768 dimensions). **Pricing**: input $0.075/M, output $0.30/M (Flash).

### Embedding Dimension Handling

**Critical constraint:** The `entries.embedding` column is `vector(1024)` (set up for Voyage AI). Changing the embedding provider changes the vector dimensions, which breaks similarity search on existing embeddings.

**Approach:** The embedding dimension is locked to the first provider used. When switching embedding providers:
1. Show a warning: "Changing embedding provider requires re-embedding all entries. This will use API tokens. Proceed?"
2. If confirmed, run a background job that re-embeds all active entries with the new provider
3. The `entries` table column dimension is updated via a migration (1024 → 1536 for OpenAI, etc.)
4. Until re-embedding completes, semantic search is disabled

**For MVP**, lock the embedding column to 1024 dimensions and only support embedding providers that output 1024-dim vectors. Anthropic (via Voyage) and OpenAI (via `text-embedding-3-small` with `dimensions: 1024` parameter — OpenAI supports dimension truncation). Gemini's `text-embedding-004` supports 768 dimensions, so it's excluded from embeddings for now unless we pad. **Simplest approach: all providers output 1024-dim embeddings** using dimension parameters where supported.

### Provider Resolution

```typescript
async function getProvider(): Promise<AIProvider> {
  const priority = await getSetting("provider_priority") ?? '["anthropic", "openai", "gemini"]';
  const ordered = JSON.parse(priority);

  for (const name of ordered) {
    const key = await getSetting(`${name}_api_key`);
    if (key) {
      return createProvider(name, key);
    }
  }

  // Fallback: check env vars for backwards compatibility
  if (process.env.ANTHROPIC_API_KEY) {
    return createProvider("anthropic", process.env.ANTHROPIC_API_KEY);
  }

  throw new Error("No AI provider configured. Add an API key in Settings.");
}
```

### Fallback Behavior

Fallback is **per-call**: when a single AI call fails (network error, auth error, rate limit), the pipeline immediately tries the next provider in priority order for that same call. If all providers fail for a call, the pipeline stage fails and the error is recorded in the run.

This means a single ingestion run can use multiple providers if the primary is flaky.

### RunTracker Updates

`RunTracker` pricing is updated to use dynamic pricing from the active provider:

```typescript
recordUsage(usage: { inputTokens: number; outputTokens: number }, provider: AIProvider): void {
  this.inputTokens += usage.inputTokens;
  this.outputTokens += usage.outputTokens;
  this.costUsd += (usage.inputTokens * provider.getInputPrice() / 1_000_000)
                + (usage.outputTokens * provider.getOutputPrice() / 1_000_000);
}
```

## Settings API

- `GET /api/admin/settings` — returns all settings with API keys masked. Masking format: first 6 chars visible + `...****` (e.g., `sk-ant...****`). Non-key settings returned as-is.
- `PUT /api/admin/settings` — accepts `{ key, value }`. If the key ends with `_api_key`, encrypts before storing. Upserts (insert or update on conflict).
- `DELETE /api/admin/settings/:key` — removes a setting (for key removal).
- `POST /api/admin/settings/validate` — accepts `{ provider }` (e.g., `"anthropic"`), reads that provider's key from settings, makes a minimal API call (list models or a 1-token completion), returns `{ valid: boolean, error?: string }`.

## Settings Page UI

New admin page at `/admin/settings`, linked from the admin nav.

### Layout

**API Keys Section**
Three cards in a column, one per provider:

```
┌─────────────────────────────────────────┐
│ Anthropic                    ● Connected │
│ API Key: sk-ant...****      [Edit] [Test]│
│ Model: claude-sonnet-4-6    [Change]     │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ OpenAI                    ○ Not configured│
│ API Key: Not set           [Add]  [Test] │
│ Model: gpt-4o              [Change]      │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Google Gemini              ○ Not configured│
│ API Key: Not set           [Add]  [Test] │
│ Model: gemini-2.0-flash   [Change]       │
└─────────────────────────────────────────┘
```

- **Status indicator**: green dot + "Connected" if key is set and last validation succeeded, gray dot + "Not configured" if no key, red dot + "Invalid" if validation failed. Status is determined at page load by checking if key exists (not re-validated on every load — use Test button to re-validate).
- **Edit/Add button**: opens inline input field for the key, save button encrypts and stores
- **Test button**: calls `POST /api/admin/settings/validate`, shows success/error toast, updates status indicator
- **Model dropdown**: lists models per provider:
  - Anthropic: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`, `claude-opus-4-6`
  - OpenAI: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
  - Gemini: `gemini-2.0-flash`, `gemini-2.5-pro`, `gemini-2.5-flash`

**Provider Priority Section**

Below the cards:
```
Provider Priority:
  1. ● Anthropic     [↑] [↓]
  2. ○ OpenAI        [↑] [↓]
  3. ○ Google Gemini [↑] [↓]

Embedding Provider: [Anthropic ▼]
```

- Status dots (●/○) next to each name show configured vs unconfigured
- Up/down buttons reorder, saving immediately via `PUT /api/admin/settings`
- Unconfigured providers shown grayed out in the list (still reorderable but skipped at runtime)
- **Embedding Provider dropdown**: only shows configured providers

### Empty State

If no providers are configured and no env vars are set:
- Dashboard shows a yellow banner: "No AI provider configured. Go to Settings to add an API key."
- "Run Now" button disabled with tooltip: "Configure an AI provider first"
- Settings page highlights the first provider card with a subtle border pulse

## Migration from Env Vars

Migration happens at **pipeline startup** (when `getProvider()` is first called), not on page load:
1. If `ANTHROPIC_API_KEY` env var is set and no `anthropic_api_key` exists in settings → auto-migrate
2. If `OPENAI_API_KEY` env var is set and no `openai_api_key` exists in settings → auto-migrate
3. Migration is idempotent — only runs if the DB setting doesn't exist yet
4. Settings page shows a notice if env var keys are detected: "API key loaded from environment variable. Save it here to manage from the UI."

## Retired Files

- `src/lib/ai/client.ts` — replaced by `src/lib/ai/providers/`. Can be deleted after migration. During transition, `getAnthropicClient()` is reimplemented to call `getProvider()` internally for backwards compatibility.
- `src/lib/embeddings/client.ts` — replaced by `provider.embed()` / `provider.embedSingle()`. Same transition approach.

## File Structure

### New Files

```
src/lib/settings/index.ts                      — getSetting, setSetting, getAllSettings (with masking)
src/lib/settings/encryption.ts                 — AES-256-GCM encrypt/decrypt with random nonce
src/lib/ai/providers/types.ts                  — AIProvider interface + pricing constants
src/lib/ai/providers/anthropic.ts              — AnthropicProvider implementation
src/lib/ai/providers/openai.ts                 — OpenAIProvider implementation
src/lib/ai/providers/gemini.ts                 — GeminiProvider implementation
src/lib/ai/providers/index.ts                  — getProvider() with fallback chain + env var compat
src/app/api/admin/settings/route.ts            — GET/PUT settings
src/app/api/admin/settings/[key]/route.ts      — DELETE setting
src/app/api/admin/settings/validate/route.ts   — POST validate provider key
src/app/admin/settings/page.tsx                — Settings page
src/components/admin/provider-card.tsx          — Individual provider card (key input, test, model select)
src/components/admin/provider-priority.tsx      — Priority ordering + embedding provider selector
src/components/admin/settings-form.tsx          — Container orchestrating cards + priority
```

### Modified Files

```
src/lib/db/schema.ts                           — add settings table
src/lib/ingestion/relevance-filter.ts          — use provider.chat() instead of direct Anthropic SDK
src/lib/ingestion/structurer.ts                — use provider.chat()
src/lib/ingestion/supersession.ts              — use provider.chat()
src/lib/ingestion/tracker.ts                   — dynamic pricing via provider.getInputPrice/getOutputPrice
src/lib/ai/client.ts                           — reimplement getAnthropicClient() as thin wrapper around getProvider() for backwards compat
src/lib/embeddings/client.ts                   — reimplement using provider.embed()/embedSingle()
src/app/admin/layout.tsx                       — add Settings link to nav
src/app/api/feed/summary/route.ts              — use getProvider().chat() instead of direct Anthropic SDK
.env.example                                   — add SETTINGS_ENCRYPTION_KEY
```

### New Dependencies

```
npm install openai @google/generative-ai
```
