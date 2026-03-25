/**
 * Parse JSON from AI responses, stripping markdown code fences if present.
 * AI models sometimes wrap JSON in ```json ... ``` blocks.
 */
export function parseJsonResponse<T = unknown>(text: string): T {
  const stripped = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return JSON.parse(stripped);
}
