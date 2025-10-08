import { cn } from "@/lib/utils";

export const COMPANIES = ["Ajad", "Soft", "Spex", "Almas", "Others"] as const;
export const ALL_COMPANIES = "All Companies";

const companies = [ALL_COMPANIES, ...COMPANIES];

interface CompanyTabsProps {
  selectedCompany: string;
  onSelectCompany: (company: string) => void;
}

export const CompanyTabs = ({ selectedCompany, onSelectCompany }: CompanyTabsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {companies.map((company) => (
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
