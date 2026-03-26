"use client";

import { formatRelativeTime } from "@/lib/utils/relative-time";

export function RelativeTime({ date, className = "" }: { date: string; className?: string }) {
  return (
    <time dateTime={date} className={className} title={new Date(date).toLocaleString()}>
      {formatRelativeTime(date)}
    </time>
  );
}
