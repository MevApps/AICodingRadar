import { type ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-foreground text-background hover:opacity-90",
  secondary: "bg-muted text-foreground hover:bg-border",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-muted-foreground hover:bg-muted",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2";
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizeClass} ${className}`}
      {...props}
    />
  );
}
