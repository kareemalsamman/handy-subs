import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [adminUrl, setAdminUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");

  useEffect(() => {
    if (domain) {
      setAdminUrl(domain.wordpress_admin_url || "");
      setSecretKey(domain.wordpress_secret_key || "");
    }
  }, [domain]);

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
              onChange={(e) => setAdminUrl(e.target.value)}
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
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter the same key from the WP plugin"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must match the key set in Handy Manager plugin on the WordPress site
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full gradient-primary text-white"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save WordPress Settings
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
