"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QueueItemEditor } from "./queue-item-editor";

interface QueueEntry {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  tools: string[];
  categories: string[];
  sources: string[];
  confidence: string;
  createdAt: string;
}

interface QueueItemProps {
  entry: QueueEntry;
  onAction: (id: string, action: "approve" | "reject") => void;
  onEdit: (id: string) => void;
  isEditing: boolean;
  onSaveEdit: (id: string, updates: Record<string, unknown>) => void;
  onCancelEdit: () => void;
}

export function QueueItem({ entry, onAction, onEdit, isEditing, onSaveEdit, onCancelEdit }: QueueItemProps) {
  if (isEditing) {
    return <QueueItemEditor entry={entry} onSave={onSaveEdit} onCancel={onCancelEdit} />;
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={entry.type as any}>{entry.type}</Badge>
            <Badge variant="draft">{entry.confidence}</Badge>
          </div>
          <h3 className="mt-2 font-semibold">{entry.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{entry.summary}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {entry.tools.map((tool) => (
              <Badge key={tool}>{tool}</Badge>
            ))}
            {entry.categories.map((cat) => (
              <Badge key={cat} variant="default">{cat}</Badge>
            ))}
          </div>

          {entry.sources.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">Sources: </span>
              {entry.sources.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  {new URL(src).hostname}
                  {i < entry.sources.length - 1 ? ", " : ""}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={() => onAction(entry.id, "approve")}>
            Approve
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onEdit(entry.id)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => onAction(entry.id, "reject")}>
            Reject
          </Button>
        </div>
      </div>
    </Card>
  );
}
