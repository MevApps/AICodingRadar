import { type HTMLAttributes } from "react";

const variants = {
  default: "bg-gray-100 text-gray-800",
  tip: "bg-blue-100 text-blue-800",
  comparison: "bg-purple-100 text-purple-800",
  guide: "bg-green-100 text-green-800",
  breaking: "bg-red-100 text-red-800",
  superseded: "bg-gray-200 text-gray-500 line-through",
  draft: "bg-yellow-100 text-yellow-800",
  verified: "bg-emerald-100 text-emerald-800",
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
