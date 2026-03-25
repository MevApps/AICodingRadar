import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GuideCardProps {
  title: string;
  summary: string;
  tools: string[];
  categories: string[];
}

export function GuideCard({ title, summary, tools, categories }: GuideCardProps) {
  return (
    <Card className="border-green-200">
      <div className="flex items-center gap-2">
        <Badge variant="guide">Guide</Badge>
        {categories.map((cat) => (
          <Badge key={cat}>{cat}</Badge>
        ))}
      </div>
      <h3 className="mt-3 font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{summary}</p>
      <div className="mt-3 flex gap-2">
        {tools.map((tool) => (
          <Badge key={tool}>{tool}</Badge>
        ))}
      </div>
    </Card>
  );
}
