import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, RefreshCw, Download, Globe,
  CheckCircle2, AlertCircle, Clock, Shield, XCircle, Play, Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  users: { username: string; company: string };
}

type SiteProgress = {
  id: string;
  domain_url: string;
  status: "pending" | "checking" | "updating" | "done" | "error";
  message?: string;
  plugins?: number;
  themes?: number;
};

const WordPressUpdates = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [domains, setDomains] = useState<DomainStatus[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Batch operation state
  const [batchMode, setBatchMode] = useState<"idle" | "checking" | "updating">("idle");
  const [batchProgress, setBatchProgress] = useState<SiteProgress[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const cancelRef = useRef(false);

  useEffect(() => {
    fetchDomains();
  }, []);

  // Auto-check: if oldest check is >24h ago, prompt to run
  useEffect(() => {
    if (domains.length > 0 && batchMode === "idle") {
      const oldest = domains.reduce((min, d) => {
        if (!d.last_checked) return 0;
        const t = new Date(d.last_checked).getTime();
        return min === 0 ? t : Math.min(min, t);
      }, 0);
      const unchecked = domains.filter(d => !d.last_checked).length;
      const hoursAgo = oldest === 0 ? 999 : (Date.now() - oldest) / 3600000;

      if (hoursAgo >= 24 || unchecked > 0) {
        // Auto-start check
        startBatchCheck();
      }
    }
  }, [domains.length]);

  const fetchDomains = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("domains")
        .select("id, domain_url, wordpress_admin_url, wordpress_secret_key, wordpress_update_available, plugins_updates_count, themes_updates_count, last_checked, users(username, company)")
        .not("wordpress_admin_url", "is", null)
        .not("wordpress_secret_key", "is", null);

      if (error) throw error;
      setDomains((data as any) || []);
    } catch (error: any) {
      toast.error("Failed to load WordPress domains");
    } finally {
      setIsLoading(false);
    }
  };

  const getApiBase = (adminUrl: string) => {
    return adminUrl.replace(/\/wp-admin\/?$/, "").replace(/\/$/, "") + "/wp-json/handy-manager/v1";
  };

  const checkSingleDomain = async (domain: DomainStatus) => {
    const res = await fetch(`${getApiBase(domain.wordpress_admin_url!)}/status`, {
      method: "GET",
      headers: { "X-Handy-Secret": domain.wordpress_secret_key!, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Plugin error");

    await supabase.from("domains").update({
      wordpress_update_available: data.core_update || data.plugins_count > 0 || data.themes_count > 0,
      plugins_updates_count: data.plugins_count || 0,
      themes_updates_count: data.themes_count || 0,
      last_checked: new Date().toISOString(),
    }).eq("id", domain.id);

    return data;
  };

  const updateSingleDomain = async (domain: DomainStatus) => {
    const res = await fetch(`${getApiBase(domain.wordpress_admin_url!)}/update`, {
      method: "POST",
      headers: { "X-Handy-Secret": domain.wordpress_secret_key!, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ type: "all" }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const remaining = data.remaining || {};
    await supabase.from("domains").update({
      wordpress_update_available: (remaining.plugins_count || 0) > 0 || (remaining.themes_count || 0) > 0 || remaining.core_update,
      plugins_updates_count: remaining.plugins_count || 0,
      themes_updates_count: remaining.themes_count || 0,
      last_checked: new Date().toISOString(),
    }).eq("id", domain.id);

    return data;
  };

  // ─── BATCH OPERATIONS WITH PROGRESS ────────────────────────────────

  const startBatchCheck = () => {
    cancelRef.current = false;
    setBatchMode("checking");
    setBatchIndex(0);
    setBatchProgress(domains.map(d => ({
      id: d.id, domain_url: d.domain_url, status: "pending",
    })));
    runBatch("checking", domains);
  };

  const startBatchUpdate = () => {
    const toUpdate = domains.filter(d => d.wordpress_update_available);
    if (toUpdate.length === 0) { toast.info("No sites need updates"); return; }
    cancelRef.current = false;
    setBatchMode("updating");
    setBatchIndex(0);
    setBatchProgress(toUpdate.map(d => ({
      id: d.id, domain_url: d.domain_url, status: "pending",
    })));
    runBatch("updating", toUpdate);
  };

  const runBatch = async (mode: "checking" | "updating", sites: DomainStatus[]) => {
    for (let i = 0; i < sites.length; i++) {
      if (cancelRef.current) break;

      const site = sites[i];
      setBatchIndex(i);
      setBatchProgress(prev => prev.map(p =>
        p.id === site.id ? { ...p, status: mode === "checking" ? "checking" : "updating" } : p
      ));

      try {
        if (mode === "checking") {
          const data = await checkSingleDomain(site);
          setBatchProgress(prev => prev.map(p =>
            p.id === site.id ? {
              ...p, status: "done",
              plugins: data.plugins_count || 0,
              themes: data.themes_count || 0,
              message: `${(data.plugins_count || 0) + (data.themes_count || 0)} updates`,
            } : p
          ));
        } else {
          const data = await updateSingleDomain(site);
          const s = data.summary || {};
          setBatchProgress(prev => prev.map(p =>
            p.id === site.id ? {
              ...p, status: "done",
              message: `${s.plugins_updated || 0} plugins, ${s.themes_updated || 0} themes updated`,
            } : p
          ));
        }
      } catch (err: any) {
        setBatchProgress(prev => prev.map(p =>
          p.id === site.id ? {
            ...p, status: "error",
            message: err.message?.includes("Failed to fetch") ? "Cannot reach site" : (err.message || "Failed"),
          } : p
        ));
        await supabase.from("wordpress_update_logs").insert({
          domain_id: site.id, status: "error",
          details: JSON.stringify({ error: err.message }),
        });
      }
    }

    setBatchMode("idle");
    await fetchDomains();

    if (!cancelRef.current) {
      const done = batchProgress.filter(p => p.status === "done").length;
      toast.success(`${mode === "checking" ? "Check" : "Update"} complete!`);
    }
  };

  const cancelBatch = () => {
    cancelRef.current = true;
    setBatchMode("idle");
    toast.info("Cancelled");
  };

  // ─── SINGLE DOMAIN HANDLERS ──────────────────────────────────────

  const handleCheckOne = async (domainId: string) => {
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return;
    try {
      setIsUpdating(domainId);
      const data = await checkSingleDomain(domain);
      const total = (data.plugins_count || 0) + (data.themes_count || 0);
      toast.success(total > 0 ? `Found ${total} update(s)` : "Up to date!");
      await fetchDomains();
    } catch (e: any) {
      toast.error(e.message?.includes("Failed to fetch") ? "Cannot reach site" : e.message);
    } finally { setIsUpdating(null); }
  };

  const handleUpdateOne = async (domainId: string, domainUrl: string) => {
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return;
    try {
      setIsUpdating(domainId);
      const data = await updateSingleDomain(domain);
      const s = data.summary || {};
      toast.success(`Updated: ${s.plugins_updated || 0} plugins, ${s.themes_updated || 0} themes`);
      await fetchDomains();
    } catch (e: any) { toast.error(e.message); }
    finally { setIsUpdating(null); }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const domainsWithUpdates = domains.filter(d => d.last_checked && d.wordpress_update_available);
  const domainsUpToDate = domains.filter(d => d.last_checked && !d.wordpress_update_available);
  const domainsUnchecked = domains.filter(d => !d.last_checked);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isBatchRunning = batchMode !== "idle";
  const batchDone = batchProgress.filter(p => p.status === "done" || p.status === "error").length;
  const batchTotal = batchProgress.length;
  const batchPct = batchTotal > 0 ? Math.round((batchDone / batchTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-primary px-4 pt-6 pb-8 rounded-b-3xl shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Button onClick={() => navigate("/")} variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">WordPress Updates</h1>
            <p className="text-white/90 text-sm mt-1">{domains.length} sites managed</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{domains.length}</p>
            <p className="text-xs text-white/80">Total</p>
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

      <div className="px-4 py-6 space-y-4">
        {/* Batch Progress Panel */}
        {isBatchRunning && (
          <Card className="glass-strong p-4 border-primary/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {batchMode === "checking" ? "Checking" : "Updating"} Sites ({batchDone}/{batchTotal})
              </h3>
              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={cancelBatch}>
                <Square className="h-3 w-3 mr-1" /> Cancel
              </Button>
            </div>

            <Progress value={batchPct} className="h-3 mb-4" />

            <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
              {batchProgress.map((site) => (
                <div key={site.id} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs">
                  <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                    {site.status === "pending" && <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                    {(site.status === "checking" || site.status === "updating") && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                    {site.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    {site.status === "error" && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                  <span className={cn(
                    "flex-1 truncate",
                    site.status === "done" ? "text-foreground" :
                    site.status === "error" ? "text-red-500" :
                    (site.status === "checking" || site.status === "updating") ? "text-primary font-medium" :
                    "text-muted-foreground"
                  )}>
                    {site.domain_url}
                  </span>
                  {site.message && (
                    <span className={cn(
                      "text-[10px] shrink-0",
                      site.status === "error" ? "text-red-400" : "text-muted-foreground"
                    )}>
                      {site.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        {!isBatchRunning && (
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={startBatchCheck} disabled={domains.length === 0} className="gradient-primary text-white hover:shadow-lg transition-all">
              <Play className="mr-2 h-4 w-4" /> Check All
            </Button>
            <Button onClick={startBatchUpdate} disabled={domainsWithUpdates.length === 0} variant="outline" className="border-primary text-primary hover:bg-primary/10">
              <Download className="mr-2 h-4 w-4" /> Update All
            </Button>
          </div>
        )}

        {/* Batch Complete Summary */}
        {!isBatchRunning && batchProgress.length > 0 && (
          <Card className="glass p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Last Batch Result</h3>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setBatchProgress([])}>Clear</Button>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-green-500 font-medium">
                {batchProgress.filter(p => p.status === "done").length} success
              </span>
              <span className="text-red-500 font-medium">
                {batchProgress.filter(p => p.status === "error").length} errors
              </span>
            </div>
          </Card>
        )}

        {/* No sites */}
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
                <DomainCard key={domain.id} domain={domain} isUpdating={isUpdating === domain.id}
                  onCheck={() => handleCheckOne(domain.id)} onUpdate={() => handleUpdateOne(domain.id, domain.domain_url)}
                  formatDate={formatDate} onManage={() => navigate(`/site-manager/${domain.id}`)} />
              ))}
            </div>
          </>
        )}

        {/* Up to date */}
        {domainsUpToDate.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mt-6">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Up to Date
            </h2>
            <div className="space-y-3">
              {domainsUpToDate.map((domain) => (
                <DomainCard key={domain.id} domain={domain} isUpdating={isUpdating === domain.id}
                  onCheck={() => handleCheckOne(domain.id)} onUpdate={() => handleUpdateOne(domain.id, domain.domain_url)}
                  formatDate={formatDate} onManage={() => navigate(`/site-manager/${domain.id}`)} />
              ))}
            </div>
          </>
        )}

        {/* Unchecked */}
        {domainsUnchecked.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mt-6">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Not Checked Yet
            </h2>
            <div className="space-y-3">
              {domainsUnchecked.map((domain) => (
                <DomainCard key={domain.id} domain={domain} isUpdating={isUpdating === domain.id}
                  onCheck={() => handleCheckOne(domain.id)} onUpdate={() => handleUpdateOne(domain.id, domain.domain_url)}
                  formatDate={formatDate} onManage={() => navigate(`/site-manager/${domain.id}`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function DomainCard({ domain, isUpdating, onCheck, onUpdate, formatDate, onManage }: {
  domain: DomainStatus; isUpdating: boolean;
  onCheck: () => void; onUpdate: () => void;
  formatDate: (d: string | null) => string; onManage: () => void;
}) {
  const totalUpdates = (domain.plugins_updates_count || 0) + (domain.themes_updates_count || 0);

  return (
    <Card className="glass p-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={onManage}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Globe className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-sm text-primary truncate">{domain.domain_url}</span>
        </div>
        {domain.wordpress_update_available && totalUpdates > 0 && (
          <Badge variant="destructive" className="text-xs shrink-0 ml-2">{totalUpdates} update{totalUpdates > 1 ? "s" : ""}</Badge>
        )}
        {domain.wordpress_update_available === false && (
          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs shrink-0 ml-2">Up to date</Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div>
          <p className="text-muted-foreground">Plugins</p>
          <p className="font-semibold text-foreground">{domain.plugins_updates_count ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Themes</p>
          <p className="font-semibold text-foreground">{domain.themes_updates_count ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Checked</p>
          <p className="font-semibold text-foreground text-[10px]">{formatDate(domain.last_checked)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{domain.users?.username} · {domain.users?.company}</span>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCheck} disabled={isUpdating}>
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Check
          </Button>
          {domain.wordpress_update_available && (
            <Button size="sm" className="h-7 text-xs gradient-primary text-white" onClick={onUpdate} disabled={isUpdating}>
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
