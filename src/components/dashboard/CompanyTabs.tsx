import { cn } from "@/lib/utils";

const companies = ["All Companies", "Ajad", "Soft", "Spex", "Almas", "Others"];

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
            "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
            selectedCompany === company
              ? "bg-gradient-primary text-white shadow-md"
              : "bg-white text-foreground hover:bg-secondary"
          )}
        >
          {company}
        </button>
      ))}
    </div>
  );
};
