import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ComparisonCardProps {
  title: string;
  summary: string;
  tools: string[];
}

export function ComparisonCard({ title, summary, tools }: ComparisonCardProps) {
  return (
    <Card className="border-purple-200">
      <div className="flex items-center gap-2">
        {tools.map((tool) => (
          <Badge key={tool} variant="comparison">{tool}</Badge>
        ))}
        <span className="text-sm text-gray-400">vs</span>
      </div>
      <h3 className="mt-3 font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{summary}</p>
    </Card>
  );
}
