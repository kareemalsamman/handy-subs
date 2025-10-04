import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, ExternalLink, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AddSubscriptionDialog } from "@/components/user-detail/AddSubscriptionDialog";
import { EditSubscriptionDialog } from "@/components/user-detail/EditSubscriptionDialog";
import { TestSMSDialog } from "@/components/user-detail/TestSMSDialog";
import { WordPressSiteCard } from "@/components/user-detail/WordPressSiteCard";
import { AddWordPressSiteDialog } from "@/components/user-detail/AddWordPressSiteDialog";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface User {
  id: string;
  username: string;
  company: string;
  phone_number: string;
  created_at: string;
  domains: { 
    id: string; 
    domain_url: string;
    wordpress_admin_url?: string;
    wordpress_secret_key?: string;
    last_checked?: string;
    wordpress_update_available: boolean;
    plugins_updates_count: number;
    themes_updates_count: number;
  }[];
  subscriptions: {
    id: string;
    c_cost: number;
    domain_cost: number;
    buy_domain?: boolean;
    begin_date: string;
    expire_date: string;
    status: string;
    created_at: string;
    domain_id: string;
  }[];
}

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [isEditSubOpen, setIsEditSubOpen] = useState(false);
  const [isTestSMSOpen, setIsTestSMSOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          domains (*),
          subscriptions (*)
        `)
        .eq("id", userId)
        .single();

      if (error) throw error;
      
      // Sort subscriptions: active first, then by created_at desc
      if (data.subscriptions) {
        data.subscriptions.sort((a, b) => {
          // Active always comes first
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          // If both have same status, sort by created_at (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }
      
      setUser(data);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      toast.error("Failed to load user details");
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!deleteSubId) return;

    try {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", deleteSubId);

      if (error) throw error;

      toast.success("Subscription deleted successfully");
      fetchUser();
    } catch (error: any) {
      console.error("Error deleting subscription:", error);
      toast.error("Failed to delete subscription");
    } finally {
      setDeleteSubId(null);
    }
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-success-bg text-success-text border-success";
      case "expired":
        return "bg-expired-bg text-expired-text border-expired-border";
      case "cancelled":
        return "bg-cancelled-bg text-cancelled-text border-cancelled-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
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
            <h1 className="text-2xl font-bold text-white">{user.username}</h1>
            <p className="text-white/90 text-sm mt-1">{user.company}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white/90 justify-center">
            <span>📱</span>
            <span className="font-medium">{user.phone_number}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-4">
        {/* Domains Card */}
        <Card className="glass-strong p-4">
          <h2 className="text-lg font-semibold text-foreground mb-3">Domains</h2>
          {user.domains && user.domains.length > 0 ? (
            <div className="space-y-2">
              {user.domains.map((domain) => (
                <div key={domain.id} className="flex items-center gap-2 text-primary">
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <a
                    href={domain.domain_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline font-medium text-sm"
                  >
                    {domain.domain_url}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No domains</p>
          )}
        </Card>

        {/* Subscriptions */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">Subscriptions</h2>
          <Button
            onClick={() => setIsAddSubOpen(true)}
            size="sm"
            className="gradient-primary text-white hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {user.subscriptions && user.subscriptions.length > 0 ? (
          <div className="space-y-3">
            {user.subscriptions.map((sub) => (
              <Card key={sub.id} className="glass p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge
                    className={cn(
                      "text-xs font-semibold border capitalize",
                      getStatusBadgeClasses(sub.status)
                    )}
                  >
                    {sub.status}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setSelectedSub(sub);
                        setIsEditSubOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteSubId(sub.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">YEARLY PAY</p>
                    <p className="font-semibold text-foreground">₪{sub.c_cost}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">DOMAIN</p>
                    <p className="font-semibold text-foreground">
                      {sub.buy_domain ? `YES - ₪${sub.domain_cost || 0}` : 'NO'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">BEGIN</p>
                    <p className="font-semibold text-foreground text-xs">
                      {(() => {
                        const date = new Date(sub.begin_date);
                        const day = date.getDate().toString().padStart(2, '0');
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">EXPIRES</p>
                    <p className="font-semibold text-foreground text-xs">
                      {(() => {
                        const date = new Date(sub.expire_date);
                        const day = date.getDate().toString().padStart(2, '0');
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      })()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass-strong p-8 text-center">
            <p className="text-muted-foreground text-sm">No subscriptions yet</p>
          </Card>
        )}

        {/* WordPress Sites Management */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">WordPress Sites</h2>
            <AddWordPressSiteDialog 
              userId={user.id}
              domains={user.domains}
              onSuccess={fetchUser}
            />
          </div>

          {user.domains && user.domains.some(d => d.wordpress_secret_key) ? (
            <>
              {/* Bulk Update Summary */}
              {(() => {
                const wpSites = user.domains.filter(d => d.wordpress_secret_key);
                const sitesWithUpdates = wpSites.filter(d => 
                  d.wordpress_update_available || d.plugins_updates_count > 0 || d.themes_updates_count > 0
                );

                if (wpSites.length > 0) {
                  return (
                    <Card className="glass-strong p-4 mb-4">
                      <h3 className="font-semibold text-foreground mb-3">Bulk Actions</h3>
                      <div className="space-y-2 text-sm mb-3">
                        <p className="text-muted-foreground">Total Sites: <span className="font-semibold text-foreground">{wpSites.length}</span></p>
                        <p className="text-muted-foreground">Sites with updates: <span className="font-semibold text-destructive">{sitesWithUpdates.length}</span></p>
                      </div>
                      {sitesWithUpdates.length > 0 && (
                        <Button
                          className="w-full"
                          onClick={() => {
                            sitesWithUpdates.forEach(site => {
                              const url = `https://${site.domain_url}?fullupdate=true&key=${site.wordpress_secret_key}`;
                              window.open(url, '_blank');
                            });
                            toast.success(`Opening ${sitesWithUpdates.length} sites for updates`);
                          }}
                        >
                          Update All Sites Now
                        </Button>
                      )}
                    </Card>
                  );
                }
                return null;
              })()}

              {/* WordPress Sites Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {user.domains
                  .filter(d => d.wordpress_secret_key)
                  .map((site) => (
                    <WordPressSiteCard 
                      key={site.id}
                      site={site}
                      onUpdate={fetchUser}
                    />
                  ))}
              </div>
            </>
          ) : (
            <Card className="glass-strong p-8 text-center">
              <p className="text-muted-foreground text-sm">No WordPress sites configured</p>
              <p className="text-xs text-muted-foreground mt-2">
                Add your first WordPress site to start managing updates
              </p>
            </Card>
          )}
        </div>

        {/* SMS Testing */}
        <Button
          onClick={() => setIsTestSMSOpen(true)}
          variant="outline"
          className="w-full mt-6"
        >
          Test SMS Notifications
        </Button>
      </div>

      <AddSubscriptionDialog
        open={isAddSubOpen}
        onOpenChange={setIsAddSubOpen}
        userId={user.id}
        domains={user.domains}
        onSuccess={fetchUser}
      />

      <EditSubscriptionDialog
        open={isEditSubOpen}
        onOpenChange={setIsEditSubOpen}
        subscription={selectedSub}
        onSuccess={() => {
          fetchUser();
          setSelectedSub(null);
        }}
      />

      <TestSMSDialog
        open={isTestSMSOpen}
        onOpenChange={setIsTestSMSOpen}
        user={user}
      />

      <AlertDialog open={!!deleteSubId} onOpenChange={(open) => !open && setDeleteSubId(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subscription? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserDetail;
