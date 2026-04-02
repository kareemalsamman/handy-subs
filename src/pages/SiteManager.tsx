import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, RefreshCw, Shield, Database, AlertTriangle,
  Activity, Users, Power, Trash2, HardDrive, Server, Lock,
  CheckCircle2, XCircle, AlertCircle, FileText, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tab = "health" | "security" | "database" | "plugins" | "errors" | "users";

const SiteManager = () => {
  const { domainId } = useParams();
  const navigate = useNavigate();
  const [domain, setDomain] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("health");
  const [tabData, setTabData] = useState<any>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDomain();
  }, [domainId]);

  useEffect(() => {
    if (domain) loadTab(activeTab);
  }, [activeTab, domain]);

  const fetchDomain = async () => {
    try {
      const { data, error } = await supabase
        .from("domains")
        .select("*, users(username, company)")
        .eq("id", domainId)
        .single();
      if (error) throw error;
      setDomain(data);
    } catch (e: any) {
      toast.error("Domain not found");
      navigate("/wordpress-updates");
    } finally {
      setIsLoading(false);
    }
  };

  const getApiBase = () => {
    if (!domain?.wordpress_admin_url) return "";
    return domain.wordpress_admin_url.replace(/\/wp-admin\/?$/, "").replace(/\/$/, "") + "/wp-json/handy-manager/v1";
  };

  const apiFetch = async (endpoint: string, method = "GET", body?: any) => {
    const url = `${getApiBase()}${endpoint}`;
    const opts: RequestInit = {
      method,
      headers: {
        "X-Handy-Secret": domain.wordpress_secret_key,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const loadTab = async (tab: Tab) => {
    setTabLoading(true);
    setTabData(null);
    try {
      const endpoints: Record<Tab, string> = {
        health: "/health",
        security: "/security",
        database: "/database",
        plugins: "/plugins",
        errors: "/errors",
        users: "/users/activity",
      };
      const data = await apiFetch(endpoints[tab]);
      setTabData(data);
    } catch (e: any) {
      toast.error(`Failed to load: ${e.message}`);
    } finally {
      setTabLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "health", label: "Health", icon: Activity },
    { id: "security", label: "Security", icon: Shield },
    { id: "database", label: "Database", icon: Database },
    { id: "plugins", label: "Plugins", icon: Power },
    { id: "errors", label: "Errors", icon: AlertTriangle },
    { id: "users", label: "Users", icon: Users },
  ];

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
          <Button onClick={() => navigate("/wordpress-updates")} variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{domain?.domain_url}</h1>
            <p className="text-white/80 text-sm">{domain?.users?.username} - {domain?.users?.company}</p>
          </div>
          <Button onClick={() => loadTab(activeTab)} variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" disabled={tabLoading}>
            <RefreshCw className={cn("h-5 w-5", tabLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 -mt-4">
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-lg"
                    : "bg-card text-foreground border border-border"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        {tabLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : tabData ? (
          <>
            {activeTab === "health" && <HealthTab data={tabData} />}
            {activeTab === "security" && <SecurityTab data={tabData} />}
            {activeTab === "database" && <DatabaseTab data={tabData} apiFetch={apiFetch} />}
            {activeTab === "plugins" && <PluginsTab data={tabData} apiFetch={apiFetch} onReload={() => loadTab("plugins")} />}
            {activeTab === "errors" && <ErrorsTab data={tabData} apiFetch={apiFetch} onReload={() => loadTab("errors")} />}
            {activeTab === "users" && <UsersTab data={tabData} />}
          </>
        ) : (
          <Card className="glass-strong p-8 text-center">
            <p className="text-muted-foreground text-sm">Failed to load data. Click refresh to retry.</p>
          </Card>
        )}
      </div>
    </div>
  );
};

// ─── HEALTH TAB ──────────────────────────────────────────────────────

function HealthTab({ data }: { data: any }) {
  const wp = data.wordpress || {};
  const srv = data.server || {};
  const disk = data.disk || {};
  const ssl = data.ssl || {};
  const theme = data.theme || {};
  const plugins = data.plugins || {};

  return (
    <div className="space-y-3">
      <Card className="glass p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Server className="h-4 w-4" /> WordPress</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow label="Version" value={wp.version} />
          <InfoRow label="Memory Limit" value={wp.memory_limit} />
          <InfoRow label="Debug Mode" value={wp.debug_mode ? "ON" : "OFF"} warn={wp.debug_mode} />
          <InfoRow label="File Editing" value={wp.file_edit ? "Enabled" : "Disabled"} warn={wp.file_edit} />
          <InfoRow label="Force SSL" value={wp.force_ssl ? "Yes" : "No"} warn={!wp.force_ssl} />
          <InfoRow label="Cron" value={wp.cron_disabled ? "Disabled" : "Active"} />
        </div>
      </Card>

      <Card className="glass p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><HardDrive className="h-4 w-4" /> Server</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow label="PHP" value={srv.php_version} />
          <InfoRow label="MySQL" value={srv.mysql_version} />
          <InfoRow label="Memory Limit" value={srv.php_memory_limit} />
          <InfoRow label="Max Upload" value={srv.max_upload} />
          <InfoRow label="Max Execution" value={`${srv.max_execution}s`} />
          <InfoRow label="Server" value={srv.server_software?.split("/")[0]} />
        </div>
      </Card>

      <Card className="glass p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><HardDrive className="h-4 w-4" /> Disk & SSL</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow label="Disk Total" value={disk.total_gb ? `${disk.total_gb} GB` : "N/A"} />
          <InfoRow label="Disk Free" value={disk.free_gb ? `${disk.free_gb} GB` : "N/A"} />
          <InfoRow label="Disk Used" value={disk.used_pct ? `${disk.used_pct}%` : "N/A"} warn={disk.used_pct > 85} />
          <InfoRow label="SSL" value={ssl.enabled ? "Active" : "Not active"} warn={!ssl.enabled} />
          {ssl.expiry && <InfoRow label="SSL Expiry" value={new Date(ssl.expiry).toLocaleDateString()} />}
        </div>
      </Card>

      <Card className="glass p-4">
        <h3 className="text-sm font-semibold mb-3">Theme & Plugins</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow label="Active Theme" value={theme.name} />
          <InfoRow label="Theme Version" value={theme.version} />
          <InfoRow label="Total Plugins" value={plugins.total} />
          <InfoRow label="Active" value={plugins.active} />
          <InfoRow label="Inactive" value={plugins.inactive} warn={plugins.inactive > 0} />
        </div>
      </Card>
    </div>
  );
}

// ─── SECURITY TAB ────────────────────────────────────────────────────

function SecurityTab({ data }: { data: any }) {
  const score = data.score || 0;
  const checks = data.checks || [];
  const scoreColor = score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="space-y-3">
      <Card className="glass p-6 text-center">
        <p className="text-xs text-muted-foreground mb-1">Security Score</p>
        <p className={cn("text-5xl font-bold", scoreColor)}>{score}%</p>
      </Card>

      <Card className="glass p-4">
        <div className="space-y-2">
          {checks.map((check: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <div className="flex items-center gap-2 text-sm">
                {check.status === "pass" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                {check.status === "warning" && <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />}
                {check.status === "fail" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                {check.status === "info" && <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />}
                <span className="text-foreground">{check.check}</span>
              </div>
              <span className="text-xs text-muted-foreground">{check.detail}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── DATABASE TAB ────────────────────────────────────────────────────

function DatabaseTab({ data, apiFetch }: { data: any; apiFetch: any }) {
  const [cleaning, setCleaning] = useState(false);
  const cleanable = data.cleanable || {};
  const totalCleanable = Object.values(cleanable).reduce((s: number, v: any) => s + (v || 0), 0) as number;

  const handleOptimize = async () => {
    try {
      setCleaning(true);
      const result = await apiFetch("/database/optimize", "POST", { action: "clean_all" });
      const cleaned = result.cleaned || {};
      const total = Object.values(cleaned).reduce((s: number, v: any) => s + (v || 0), 0);
      toast.success(`Cleaned ${total} items and optimized tables`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="glass p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Database className="h-4 w-4" /> Database Size</h3>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">{data.total_size_mb} MB</Badge>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {(data.tables || []).map((t: any) => (
            <div key={t.name} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
              <span className="text-muted-foreground truncate">{t.name}</span>
              <span className="text-foreground font-medium shrink-0 ml-2">{t.size_mb} MB ({t.rows} rows)</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="glass p-4">
        <h3 className="text-sm font-semibold mb-3">Cleanable Items</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow label="Revisions" value={cleanable.revisions} warn={cleanable.revisions > 0} />
          <InfoRow label="Auto Drafts" value={cleanable.auto_drafts} warn={cleanable.auto_drafts > 0} />
          <InfoRow label="Trashed Posts" value={cleanable.trashed_posts} warn={cleanable.trashed_posts > 0} />
          <InfoRow label="Spam Comments" value={cleanable.spam_comments} warn={cleanable.spam_comments > 0} />
          <InfoRow label="Trashed Comments" value={cleanable.trashed_comments} warn={cleanable.trashed_comments > 0} />
          <InfoRow label="Expired Transients" value={cleanable.expired_transients} warn={cleanable.expired_transients > 0} />
        </div>
        {totalCleanable > 0 && (
          <Button onClick={handleOptimize} disabled={cleaning} className="w-full mt-3 gradient-primary text-white" size="sm">
            {cleaning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Clean All ({totalCleanable} items)
          </Button>
        )}
      </Card>
    </div>
  );
}

// ─── PLUGINS TAB ─────────────────────────────────────────────────────

function PluginsTab({ data, apiFetch, onReload }: { data: any; apiFetch: any; onReload: () => void }) {
  const [toggling, setToggling] = useState<string | null>(null);
  const plugins = data.plugins || [];
  const themes = data.themes || [];

  const handleToggle = async (file: string, active: boolean) => {
    try {
      setToggling(file);
      await apiFetch("/plugins/toggle", "POST", { plugin: file, action: active ? "deactivate" : "activate" });
      toast.success(`Plugin ${active ? "deactivated" : "activated"}`);
      onReload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="glass p-4">
        <h3 className="text-sm font-semibold mb-3">Plugins ({plugins.length})</h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {plugins.map((p: any) => (
            <div key={p.file} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                  {p.update && <Badge variant="destructive" className="text-[10px] shrink-0">v{p.update}</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground">v{p.version} - {p.author}</p>
              </div>
              <Button
                size="sm"
                variant={p.active ? "outline" : "default"}
                className={cn("h-7 text-xs shrink-0 ml-2", !p.active && "gradient-primary text-white")}
                onClick={() => handleToggle(p.file, p.active)}
                disabled={toggling === p.file}
              >
                {toggling === p.file ? <Loader2 className="h-3 w-3 animate-spin" /> : (p.active ? "Deactivate" : "Activate")}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="glass p-4">
        <h3 className="text-sm font-semibold mb-3">Themes ({themes.length})</h3>
        <div className="space-y-2">
          {themes.map((t: any) => (
            <div key={t.slug} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-foreground">{t.name} <span className="text-muted-foreground text-xs">v{t.version}</span></span>
              {t.active && <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Active</Badge>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── ERRORS TAB ──────────────────────────────────────────────────────

function ErrorsTab({ data, apiFetch, onReload }: { data: any; apiFetch: any; onReload: () => void }) {
  const [clearing, setClearing] = useState(false);
  const entries = data.entries || [];

  const handleClear = async () => {
    try {
      setClearing(true);
      await apiFetch("/errors/clear", "POST");
      toast.success("Error log cleared");
      onReload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="glass p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Debug Log</h3>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-[10px]", data.debug_enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
              Debug: {data.debug_enabled ? "ON" : "OFF"}
            </Badge>
            <Badge className="bg-blue-100 text-blue-700 text-[10px]">{data.log_size_kb} KB</Badge>
          </div>
        </div>

        {entries.length > 0 ? (
          <>
            <div className="bg-black/80 rounded-lg p-3 max-h-[300px] overflow-y-auto font-mono text-[10px] text-green-400 space-y-0.5">
              {entries.map((line: string, i: number) => (
                <p key={i} className={cn(line.includes("Fatal") || line.includes("Error") ? "text-red-400" : line.includes("Warning") ? "text-yellow-400" : "")}>
                  {line}
                </p>
              ))}
            </div>
            <Button onClick={handleClear} disabled={clearing} variant="outline" size="sm" className="w-full mt-3">
              {clearing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Trash2 className="h-3 w-3 mr-2" />}
              Clear Log
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {data.log_exists ? "No errors found" : "No debug.log file exists"}
          </p>
        )}
      </Card>
    </div>
  );
}

// ─── USERS TAB ───────────────────────────────────────────────────────

function UsersTab({ data }: { data: any }) {
  const users = data.users || [];

  return (
    <div className="space-y-3">
      {data.failed_logins_1h > 0 && (
        <Card className="glass p-4 bg-red-500/10 border-red-500/20">
          <div className="flex items-center gap-2 text-red-500">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-semibold">{data.failed_logins_1h} failed login attempts (last hour)</span>
          </div>
        </Card>
      )}

      <Card className="glass p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> User Activity</h3>
        <div className="space-y-3">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{u.username}</p>
                <p className="text-[10px] text-muted-foreground">{u.email} - {u.role}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-foreground">
                  {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {u.active_sessions} session{u.active_sessions !== 1 ? "s" : ""} - {u.login_count} logins
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── SHARED COMPONENTS ──────────────────────────────────────────────

function InfoRow({ label, value, warn }: { label: string; value: any; warn?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", warn ? "text-amber-500" : "text-foreground")}>{value ?? "N/A"}</span>
    </div>
  );
}

export default SiteManager;
