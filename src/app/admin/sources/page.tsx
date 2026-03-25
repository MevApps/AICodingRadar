import { SourceListWithRecommendations } from "@/components/admin/source-list-with-recommendations";

export default function SourcesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Source Management</h1>
      <SourceListWithRecommendations />
    </div>
  );
}
