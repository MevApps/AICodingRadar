import Link from "next/link";
import { StatusDashboard } from "@/components/admin/status-dashboard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-6">
          <Link href="/admin/queue" className="text-sm font-semibold">
            AI Coding Radar Admin
          </Link>
          <Link href="/admin/queue" className="text-sm text-gray-600 hover:text-black">
            Review Queue
          </Link>
          <Link href="/admin/sources" className="text-sm text-gray-600 hover:text-black">
            Sources
          </Link>
          <Link href="/admin/settings" className="text-sm text-gray-600 hover:text-black">
            Settings
          </Link>
          <Link href="/" className="ml-auto text-sm text-gray-400 hover:text-black">
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
