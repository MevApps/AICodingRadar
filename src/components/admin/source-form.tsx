"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SOURCE_TYPES, type SourceType } from "@/types";

interface SourceFormProps {
  onSubmit: (source: { url: string; type: SourceType; name: string }) => void;
}

export function SourceForm({ onSubmit }: SourceFormProps) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState<SourceType>("rss");
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ url, type, name });
    setUrl("");
    setName("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <label className="text-xs text-gray-500">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex-1">
        <label className="text-xs text-gray-500">URL</label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} required />
      </div>
      <div>
        <label className="text-xs text-gray-500">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SourceType)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <Button type="submit">Add Source</Button>
    </form>
  );
}
