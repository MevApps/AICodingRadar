import { Card } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  status?: "green" | "amber" | "red";
  onClick?: () => void;
  children?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  subtitle,
  status,
  onClick,
  children,
}: MetricCardProps) {
  const statusColors = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <Card
      className={`p-4 ${onClick ? "cursor-pointer hover:border-gray-300 transition-colors" : "cursor-default"}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </span>
        {status && (
          <span className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
        )}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      )}
      {children}
    </Card>
  );
}
