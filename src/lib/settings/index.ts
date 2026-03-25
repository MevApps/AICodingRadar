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
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (!row) return null;
  if (isEncryptedKey(key)) return decrypt(row.value);
  return row.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const storedValue = isEncryptedKey(key) ? encrypt(value) : value;
  await db.insert(settings)
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
      const decrypted = decrypt(row.value);
      result[row.key] = maskApiKey(decrypted);
    } else {
      result[row.key] = row.value;
    }
  }
  return result;
}
