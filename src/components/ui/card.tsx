import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ className = "", interactive = false, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-card text-card-foreground p-5 shadow-sm ${
        interactive
          ? "cursor-pointer transition-all hover:shadow-md hover:border-accent/30 hover:-translate-y-0.5"
          : ""
      } ${className}`}
      {...props}
    />
  );
}
