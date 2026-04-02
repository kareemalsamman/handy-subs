import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditDomainWPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: {
    id: string;
    domain_url: string;
    wordpress_admin_url?: string | null;
    wordpress_secret_key?: string | null;
  } | null;
  onSuccess: () => void;
}

export function EditDomainWPDialog({ open, onOpenChange, domain, onSuccess }: EditDomainWPDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [adminUrl, setAdminUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");

  useEffect(() => {
    if (domain) {
      setAdminUrl(domain.wordpress_admin_url || "");
      setSecretKey(domain.wordpress_secret_key || "");
      setConnectionStatus("idle");
      setConnectionMessage("");
    }
  }, [domain]);

  const handleTestConnection = async () => {
    if (!adminUrl || !secretKey) {
      toast.error("Fill in both Admin URL and Secret Key first");
      return;
    }

    try {
      setIsTesting(true);
      setConnectionStatus("idle");

      // Build the API URL the same way the edge function does
      let baseUrl = adminUrl.replace(/\/wp-admin\/?$/, '').replace(/\/$/, '');
      const apiUrl = `${baseUrl}/wp-json/handy-manager/v1/status`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-Handy-Secret': secretKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
      }

      const data = await response.json();

      if (data.success) {
        setConnectionStatus("success");
        setConnectionMessage(
          `Connected! WP ${data.wp_version} | ${data.plugins_count} plugin updates | ${data.themes_count} theme updates${data.core_update ? ` | Core update: ${data.core_update}` : ''}`
        );
        toast.success("Plugin connected successfully!");
      } else {
        throw new Error("Plugin returned unsuccessful response");
      }
    } catch (error: any) {
      setConnectionStatus("error");
      if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
        setConnectionMessage("Cannot reach the site. Check the URL or CORS settings.");
      } else {
        setConnectionMessage(error.message || "Connection failed");
      }
      toast.error("Connection failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from("domains")
        .update({
          wordpress_admin_url: adminUrl || null,
          wordpress_secret_key: secretKey || null,
        })
        .eq("id", domain.id);

      if (error) throw error;

      toast.success("WordPress settings saved!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving WordPress settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle>WordPress Settings</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{domain?.domain_url}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="admin_url" className="text-sm font-semibold">
              WordPress Admin URL
            </Label>
            <Input
              id="admin_url"
              type="url"
              value={adminUrl}
              onChange={(e) => { setAdminUrl(e.target.value); setConnectionStatus("idle"); }}
              placeholder="https://trendy-gifts.com/wp-admin"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The wp-admin URL of the WordPress site
            </p>
          </div>

          <div>
            <Label htmlFor="secret_key" className="text-sm font-semibold">
              Secret Key
            </Label>
            <Input
              id="secret_key"
              type="text"
              value={secretKey}
              onChange={(e) => { setSecretKey(e.target.value); setConnectionStatus("idle"); }}
              placeholder="Enter the same key from the WP plugin"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must match the key set in Handy Manager plugin on the WordPress site
            </p>
          </div>

          {/* Connection Status */}
          {connectionStatus !== "idle" && (
            <div className={`p-3 rounded-lg text-sm ${
              connectionStatus === "success"
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-red-500/10 border border-red-500/20"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {connectionStatus === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
                <span className={`font-semibold ${connectionStatus === "success" ? "text-green-500" : "text-red-500"}`}>
                  {connectionStatus === "success" ? "Connected" : "Connection Failed"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{connectionMessage}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !adminUrl || !secretKey}
              className="flex-1"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 gradient-primary text-white"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
