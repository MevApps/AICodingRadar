import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-8" />
      <h1 className="font-heading text-4xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">
        This page doesn't exist or has been removed.
      </p>
      <Link
        href="/"
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
      >
        Back to feed
      </Link>
    </main>
  );
}
