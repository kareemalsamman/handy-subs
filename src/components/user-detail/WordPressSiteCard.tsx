import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Loader2, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface WordPressSite {
  id: string;
  domain_url: string;
  wordpress_admin_url?: string;
  wordpress_secret_key?: string;
  last_checked?: string;
  wordpress_update_available: boolean;
  plugins_updates_count: number;
  themes_updates_count: number;
}

interface WordPressSiteCardProps {
  site: WordPressSite;
  onUpdate: () => void;
}

export function WordPressSiteCard({ site, onUpdate }: WordPressSiteCardProps) {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleCheckUpdates = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-wordpress-updates', {
        body: { domainId: site.id },
      });

      if (error) throw error;

      toast.success("Updates checked successfully");
      onUpdate();
    } catch (error: any) {
      console.error('Error checking updates:', error);
      toast.error(error.message || "Failed to check updates");
    } finally {
      setChecking(false);
    }
  };

  const handleUpdateNow = () => {
    if (!site.wordpress_secret_key) {
      toast.error("WordPress secret key not configured");
      return;
    }

    setUpdating(true);
    const updateUrl = `https://${site.domain_url}?fullupdate=true&key=${site.wordpress_secret_key}`;
    window.open(updateUrl, '_blank');
    
    toast.success("Update started in new window");
    
    // Auto-refresh after 5 seconds
    setTimeout(() => {
      handleCheckUpdates();
      setUpdating(false);
    }, 5000);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('domains')
        .update({ 
          wordpress_secret_key: null,
          last_checked: null,
          wordpress_update_available: false,
          plugins_updates_count: 0,
          themes_updates_count: 0,
        })
        .eq('id', site.id);

      if (error) throw error;

      toast.success("WordPress site removed");
      onUpdate();
    } catch (error: any) {
      console.error('Error removing site:', error);
      toast.error("Failed to remove site");
    }
  };

  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const hasUpdates = site.wordpress_update_available || site.plugins_updates_count > 0 || site.themes_updates_count > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            {site.domain_url}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">WordPress Core:</span>
              <Badge variant={site.wordpress_update_available ? "destructive" : "default"}>
                {site.wordpress_update_available ? "Update available" : "✓ Up to date"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plugins:</span>
              <Badge variant={site.plugins_updates_count > 0 ? "destructive" : "default"}>
                {site.plugins_updates_count > 0 
                  ? `${site.plugins_updates_count} update${site.plugins_updates_count > 1 ? 's' : ''} available`
                  : "✓ Up to date"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Themes:</span>
              <Badge variant={site.themes_updates_count > 0 ? "destructive" : "default"}>
                {site.themes_updates_count > 0 
                  ? `${site.themes_updates_count} update${site.themes_updates_count > 1 ? 's' : ''} available`
                  : "✓ Up to date"}
              </Badge>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Last checked: {getRelativeTime(site.last_checked)}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCheckUpdates}
              disabled={checking || !site.wordpress_secret_key}
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Check Updates</span>
            </Button>
            
            {hasUpdates && (
              <Button
                size="sm"
                onClick={handleUpdateNow}
                disabled={updating || !site.wordpress_secret_key}
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                <span className="ml-2">Update Now</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="ml-2">Remove</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove WordPress Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove WordPress management for {site.domain_url}?
              This will only remove the management settings, not the actual website.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}