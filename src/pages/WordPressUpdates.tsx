import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  Download,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DomainStatus {
  id: string;
  domain_url: string;
  wordpress_admin_url: string | null;
  wordpress_secret_key: string | null;
  wordpress_update_available: boolean | null;
  plugins_updates_count: number | null;
  themes_updates_count: number | null;
  last_checked: string | null;
  users: {
    username: string;
    company: string;
  };
}

interface UpdateLog {
  id: string;
  domain_id: string;
  status: string;
  details: string | null;
  created_at: string;
}

const WordPressUpdates = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainStatus[]>([]);
  const [recentLogs, setRecentLogs] = useState<UpdateLog[]>([]);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setIsLoading(true);

      const [domainsRes, logsRes] = await Promise.all([
        supabase
          .from("domains")
          .select("id, domain_url, wordpress_admin_url, wordpress_secret_key, wordpress_update_available, plugins_updates_count, themes_updates_count, last_checked, users(username, company)")
          .not("wordpress_admin_url", "is", null)
          .not("wordpress_secret_key", "is", null),
        supabase
          .from("wordpress_update_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (domainsRes.error) throw domainsRes.error;
      setDomains((domainsRes.data as any) || []);
      setRecentLogs((logsRes.data as any) || []);
    } catch (error: any) {
      console.error("Error fetching domains:", error);
      toast.error("Failed to load WordPress domains");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAll = async () => {
    try {
      setIsChecking(true);
      toast.info("Checking all WordPress sites for updates...");

      const { data, error } = await supabase.functions.invoke("run-wordpress-updates", {
        body: { mode: "check" },
      });

      if (error) throw error;

      const summary = data?.summary;
      toast.success(
        `Check complete: ${summary?.checked || 0} checked, ${summary?.errors || 0} errors`
      );
      await fetchDomains();
    } catch (error: any) {
      console.error("Error checking updates:", error);
      toast.error(error.message || "Failed to check for updates");
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckOne = async (domainId: string) => {
    try {
      setIsUpdating(domainId);
      toast.info("Checking site for updates...");

      const { data, error } = await supabase.functions.invoke("run-wordpress-updates", {
        body: { mode: "check", domain_id: domainId },
      });

      if (error) throw error;

      const result = data?.results?.[0];
      if (result?.status === "error") {
        toast.error(`Error: ${result.details?.error}`);
      } else {
        toast.success("Check complete!");
      }
      await fetchDomains();
    } catch (error: any) {
      console.error("Error checking domain:", error);
      toast.error(error.message || "Failed to check domain");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateOne = async (domainId: string, domainUrl: string) => {
    try {
      setIsUpdating(domainId);
      toast.info(`Updating ${domainUrl}...`);

      const { data, error } = await supabase.functions.invoke("run-wordpress-updates", {
        body: { mode: "update", domain_id: domainId, update_type: "all" },
      });

      if (error) throw error;

      const result = data?.results?.[0];
      if (result?.status === "error") {
        toast.error(`Error: ${result.details?.error}`);
      } else {
        toast.success(`${domainUrl} updated successfully!`);
      }
      await fetchDomains();
    } catch (error: any) {
      console.error("Error updating domain:", error);
      toast.error(error.message || "Failed to update domain");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUpdateAll = async () => {
    try {
      setIsChecking(true);
      toast.info("Updating all WordPress sites...");

      const { data, error } = await supabase.functions.invoke("run-wordpress-updates", {
        body: { mode: "update", update_type: "all" },
      });

      if (error) throw error;

      const summary = data?.summary;
      toast.success(
        `Update complete: ${summary?.updated || 0} updated, ${summary?.errors || 0} errors`
      );
      await fetchDomains();
    } catch (error: any) {
      console.error("Error updating all:", error);
      toast.error(error.message || "Failed to update sites");
    } finally {
      setIsChecking(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  const domainsWithUpdates = domains.filter((d) => d.wordpress_update_available);
  const domainsUpToDate = domains.filter((d) => d.wordpress_update_available === false);
  const domainsUnchecked = domains.filter((d) => d.wordpress_update_available === null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary px-4 pt-6 pb-8 rounded-b-3xl shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">WordPress Updates</h1>
            <p className="text-white/90 text-sm mt-1">
              Manage updates across all WordPress sites
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{domains.length}</p>
            <p className="text-xs text-white/80">Total Sites</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-yellow-200">{domainsWithUpdates.length}</p>
            <p className="text-xs text-white/80">Need Updates</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-200">{domainsUpToDate.length}</p>
            <p className="text-xs text-white/80">Up to Date</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-4">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleCheckAll}
            disabled={isChecking || domains.length === 0}
            className="gradient-primary text-white hover:shadow-lg transition-all"
          >
            {isChecking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Check All
          </Button>
          <Button
            onClick={handleUpdateAll}
            disabled={isChecking || domainsWithUpdates.length === 0}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            {isChecking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Update All
          </Button>
        </div>

        {/* No sites message */}
        {domains.length === 0 && (
          <Card className="glass-strong p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No WordPress sites configured yet. Add WordPress admin URL and secret key to a domain to get started.
            </p>
          </Card>
        )}

        {/* Sites needing updates */}
        {domainsWithUpdates.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Updates Available
            </h2>
            <div className="space-y-3">
              {domainsWithUpdates.map((domain) => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  isUpdating={isUpdating === domain.id}
                  onCheck={() => handleCheckOne(domain.id)}
                  onUpdate={() => handleUpdateOne(domain.id, domain.domain_url)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </>
        )}

        {/* Sites up to date */}
        {domainsUpToDate.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mt-6">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Up to Date
            </h2>
            <div className="space-y-3">
              {domainsUpToDate.map((domain) => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  isUpdating={isUpdating === domain.id}
                  onCheck={() => handleCheckOne(domain.id)}
                  onUpdate={() => handleUpdateOne(domain.id, domain.domain_url)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </>
        )}

        {/* Unchecked sites */}
        {domainsUnchecked.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mt-6">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Not Checked Yet
            </h2>
            <div className="space-y-3">
              {domainsUnchecked.map((domain) => (
                <DomainCard
                  key={domain.id}
                  domain={domain}
                  isUpdating={isUpdating === domain.id}
                  onCheck={() => handleCheckOne(domain.id)}
                  onUpdate={() => handleUpdateOne(domain.id, domain.domain_url)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </>
        )}

        {/* Recent Logs */}
        {recentLogs.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-foreground mt-6">Recent Activity</h2>
            <Card className="glass-strong p-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentLogs.map((log) => {
                  const domain = domains.find((d) => d.id === log.domain_id);
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge
                          className={cn(
                            "text-xs shrink-0",
                            log.status === "updated"
                              ? "bg-green-100 text-green-700 border-green-200"
                              : log.status === "checked"
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : "bg-red-100 text-red-700 border-red-200"
                          )}
                        >
                          {log.status}
                        </Badge>
                        <span className="truncate text-muted-foreground">
                          {domain?.domain_url || "Unknown"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

// Domain card component
function DomainCard({
  domain,
  isUpdating,
  onCheck,
  onUpdate,
  formatDate,
}: {
  domain: DomainStatus;
  isUpdating: boolean;
  onCheck: () => void;
  onUpdate: () => void;
  formatDate: (d: string | null) => string;
}) {
  const totalUpdates = (domain.plugins_updates_count || 0) + (domain.themes_updates_count || 0);

  return (
    <Card className="glass p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Globe className="h-4 w-4 text-primary shrink-0" />
          <a
            href={domain.domain_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sm text-primary hover:underline truncate"
          >
            {domain.domain_url}
          </a>
        </div>
        {domain.wordpress_update_available && totalUpdates > 0 && (
          <Badge variant="destructive" className="text-xs shrink-0 ml-2">
            {totalUpdates} update{totalUpdates > 1 ? "s" : ""}
          </Badge>
        )}
        {domain.wordpress_update_available === false && (
          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs shrink-0 ml-2">
            Up to date
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div>
          <p className="text-muted-foreground">Plugins</p>
          <p className="font-semibold text-foreground">
            {domain.plugins_updates_count ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Themes</p>
          <p className="font-semibold text-foreground">
            {domain.themes_updates_count ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Checked</p>
          <p className="font-semibold text-foreground text-[10px]">
            {formatDate(domain.last_checked)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {domain.users?.username} · {domain.users?.company}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onCheck}
            disabled={isUpdating}
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Check
          </Button>
          {domain.wordpress_update_available && (
            <Button
              size="sm"
              className="h-7 text-xs gradient-primary text-white"
              onClick={onUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
              Update
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default WordPressUpdates;
