import { QueueList } from "@/components/admin/queue-list";

export default function QueuePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Review Queue</h1>
      <QueueList />
    </div>
  );
}
