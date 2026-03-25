import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BreakingCardProps {
  title: string;
  summary: string;
  tools: string[];
}

export function BreakingCard({ title, summary, tools }: BreakingCardProps) {
  return (
    <Card className="border-2 border-red-400 bg-red-50">
      <div className="flex items-center gap-2">
        <Badge variant="breaking">Breaking</Badge>
        {tools.map((tool) => (
          <Badge key={tool}>{tool}</Badge>
        ))}
      </div>
      <h3 className="mt-3 font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{summary}</p>
    </Card>
  );
}
