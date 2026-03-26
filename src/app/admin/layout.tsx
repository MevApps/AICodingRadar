import Link from "next/link";
import { StatusDashboard } from "@/components/admin/status-dashboard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted">
      <nav className="border-b bg-background px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-6">
          <Link href="/admin/queue" className="font-heading text-sm font-semibold text-foreground">
            Coding Radar Admin
          </Link>
          <Link href="/admin/queue" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Review Queue
          </Link>
          <Link href="/admin/sources" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sources
          </Link>
          <Link href="/admin/settings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Settings
          </Link>
          <Link href="/" className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors">
            View Feed
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <StatusDashboard />
        {children}
      </main>
    </div>
  );
}
