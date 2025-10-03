import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
}

export const StatsCard = ({ icon, label, value, iconBg }: StatsCardProps) => {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3", iconBg)}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};
