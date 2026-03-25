"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditableEntry {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  tools: string[];
  categories: string[];
}

interface QueueItemEditorProps {
  entry: EditableEntry;
  onSave: (id: string, updates: Record<string, unknown>) => void;
  onCancel: () => void;
}

const ENTRY_TYPES = ["tip", "comparison", "guide", "breaking"] as const;
const VALID_CATEGORIES = [
  "Code Generation", "Code Review", "Testing", "Debugging", "DevOps", "Architecture",
] as const;

export function QueueItemEditor({ entry, onSave, onCancel }: QueueItemEditorProps) {
  const [title, setTitle] = useState(entry.title);
  const [summary, setSummary] = useState(entry.summary);
  const [body, setBody] = useState(entry.body);
  const [type, setType] = useState(entry.type);
  const [tools, setTools] = useState(entry.tools.join(", "));
  const [categories, setCategories] = useState<string[]>(entry.categories);

  const handleSave = () => {
    const updates: Record<string, unknown> = {};
    if (title !== entry.title) updates.title = title;
    if (summary !== entry.summary) updates.summary = summary;
    if (body !== entry.body) updates.body = body;
    if (type !== entry.type) updates.type = type;

    const parsedTools = tools.split(",").map((t) => t.trim()).filter(Boolean);
    if (JSON.stringify(parsedTools) !== JSON.stringify(entry.tools)) {
      updates.tools = parsedTools;
    }
    if (JSON.stringify(categories) !== JSON.stringify(entry.categories)) {
      updates.categories = categories;
    }

    onSave(entry.id, updates);
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div>
        <label className="text-xs font-medium text-gray-600">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {ENTRY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Summary</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Body (markdown)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Tools (comma-separated)</label>
        <Input value={tools} onChange={(e) => setTools(e.target.value)} className="mt-1" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Categories</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {VALID_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categories.includes(cat)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={handleSave}>Save & Approve</Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
