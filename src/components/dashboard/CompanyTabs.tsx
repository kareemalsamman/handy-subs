import { cn } from "@/lib/utils";

export const ALL_COMPANIES = "All Companies";

interface CompanyTabsProps {
  selectedCompany: string;
  onSelectCompany: (company: string) => void;
  categories: string[];
}

export const CompanyTabs = ({ selectedCompany, onSelectCompany, categories }: CompanyTabsProps) => {
  const tabs = [ALL_COMPANIES, ...categories];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {tabs.map((company) => (
        <button
          key={company}
          onClick={() => onSelectCompany(company)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-normal",
            selectedCompany === company
              ? "bg-gradient-primary text-white shadow-glow scale-105"
              : "bg-card text-foreground hover:bg-secondary border border-border",
          )}
        >
          {company}
        </button>
      ))}
    </div>
  );
};
