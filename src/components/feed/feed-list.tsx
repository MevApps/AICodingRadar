"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { FeedCard } from "./feed-card";
import { motion, AnimatePresence } from "framer-motion";

interface Entry {
  id: string;
  type: "tip" | "comparison" | "guide" | "breaking";
  title: string;
  summary: string;
  body: string;
  tools: string[];
  categories: string[];
  slug: string;
  publishedAt: string;
}

export function FeedList() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/feed?${params.toString()}`);
      const data = await res.json();
      return data;
    },
    [searchParams]
  );

  useEffect(() => {
    setLoading(true);
    fetchEntries().then((data) => {
      setEntries(data.items);
      setNextCursor(data.nextCursor);
      setLoading(false);
    });
  }, [fetchEntries]);

  useEffect(() => {
    function handleScroll() {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
        nextCursor &&
        !loading
      ) {
        setLoading(true);
        fetchEntries(nextCursor).then((data) => {
          setEntries((prev) => [...prev, ...data.items]);
          setNextCursor(data.nextCursor);
          setLoading(false);
        });
      }
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [nextCursor, loading, fetchEntries]);

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FeedCard entry={entry} />
          </motion.div>
        ))}
      </AnimatePresence>

      {loading && (
        <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
      )}

      {!loading && !nextCursor && entries.length > 0 && (
        <div className="py-8 text-center text-sm text-gray-500">
          You&apos;re all caught up
        </div>
      )}
    </div>
  );
}
