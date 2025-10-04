import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
}

export const StatsCard = ({ icon, label, value, iconBg }: StatsCardProps) => {
  return (
    <div className="glass rounded-xl p-4 hover:shadow-lg transition-all duration-normal hover:-translate-y-1">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3", iconBg)}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
};
