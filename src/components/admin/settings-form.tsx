"use client";

import { useEffect, useState, useCallback } from "react";
import { ProviderCard } from "./provider-card";
import { ProviderPriority } from "./provider-priority";

const PROVIDERS = ["anthropic", "openai", "gemini", "openrouter"];
const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  openrouter: "meta-llama/llama-3.1-8b-instruct:free",
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

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

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
        onReorder={(order) => saveSetting("provider_priority", JSON.stringify(order))}
        onEmbeddingChange={(provider) => saveSetting("embedding_provider", provider)}
      />
    </div>
  );
}
