import { type HTMLAttributes } from "react";

const variants = {
  default: "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300",
  tip: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  comparison: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  guide: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  breaking: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  superseded: "bg-gray-200 text-gray-500 line-through dark:bg-zinc-800 dark:text-zinc-500",
  draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  verified: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
} as const;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ variant = "default", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
