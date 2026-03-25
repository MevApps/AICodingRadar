"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { scoreRecommendations } from "@/lib/sources/recommendations";
import registry from "@/data/source-registry.json";
import { motion, AnimatePresence } from "framer-motion";

interface SuggestedSourcesProps {
  existingSourceUrls: string[];
  trackedTools: string[];
  trackedCategories: string[];
  onAdd: (source: { url: string; type: string; name: string }) => Promise<void>;
}

export function SuggestedSources({
  existingSourceUrls,
  trackedTools,
  trackedCategories,
  onAdd,
}: SuggestedSourcesProps) {
  const [showAll, setShowAll] = useState(false);
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());

  const allExcluded = [...existingSourceUrls, ...addedUrls];
  const recommendations = scoreRecommendations(
    registry,
    allExcluded,
    trackedTools,
    trackedCategories,
    showAll ? 50 : 5
  );

  async function handleAdd(rec: { url: string; type: string; name: string }) {
    await onAdd(rec);
    setAddedUrls((prev) => new Set([...prev, rec.url]));
  }

  if (recommendations.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Suggested Sources</h2>
        <p className="mt-2 text-sm text-gray-500">
          You're tracking all our recommended sources.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Suggested Sources</h2>
        <p className="text-sm text-gray-500">Based on the tools and topics you track</p>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {recommendations.map((rec) => (
            <motion.div
              key={rec.url}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rec.name}</span>
                    <Badge>{rec.type}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{rec.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {rec.tools.map((tool) => (
                      <Badge key={tool} variant="tip">{tool}</Badge>
                    ))}
                    {rec.categories.map((cat) => (
                      <Badge key={cat} variant="default">{cat}</Badge>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleAdd(rec)}>
                  + Add
                </Button>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!showAll && recommendations.length >= 5 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-sm text-gray-500 hover:text-black"
        >
          Show more suggestions
        </button>
      )}
    </div>
  );
}
