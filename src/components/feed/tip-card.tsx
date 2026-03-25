import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TipCardProps {
  title: string;
  summary: string;
  tools: string[];
}

export function TipCard({ title, summary, tools }: TipCardProps) {
  return (
    <Card className="flex gap-4">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{summary}</p>
        <div className="mt-3 flex gap-2">
          {tools.map((tool) => (
            <Badge key={tool}>{tool}</Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
