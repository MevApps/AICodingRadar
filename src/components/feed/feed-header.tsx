import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function FeedHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border pb-4 mb-6">
      <Link href="/">
        <Logo />
      </Link>
      <nav className="flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/about" className="hover:text-foreground transition-colors">
          About
        </Link>
        <Link
          href="/feed.xml"
          className="hover:text-foreground transition-colors"
          title="RSS Feed"
        >
          RSS
        </Link>
      </nav>
    </header>
  );
}
