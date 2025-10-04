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
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface User {
  id: string;
  username: string;
  company: string;
  phone_number: string;
  created_at: string;
  domains: { id: string; domain_url: string }[];
  subscriptions: {
    id: string;
    c_cost: number;
    m_cost: number;
    profit: number;
    begin_date: string;
    expire_date: string;
    status: string;
    created_at: string;
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
          <div className="flex items-center gap-2 text-white/90">
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
                    <p className="text-xs text-muted-foreground mb-1">C-COST</p>
                    <p className="font-semibold text-foreground">₪{sub.c_cost}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">M-COST</p>
                    <p className="font-semibold text-foreground">₪{sub.m_cost}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">PROFIT</p>
                    <p className="font-semibold text-success-text">₪{sub.profit?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">BEGIN</p>
                    <p className="font-semibold text-foreground text-xs">
                      {new Date(sub.begin_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">EXPIRES</p>
                    <p className="font-semibold text-foreground text-xs">
                      {new Date(sub.expire_date).toLocaleDateString()}
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

        {/* SMS Testing */}
        <Button
          onClick={() => setIsTestSMSOpen(true)}
          variant="outline"
          className="w-full"
        >
          Test SMS Notifications
        </Button>
      </div>

      <AddSubscriptionDialog
        open={isAddSubOpen}
        onOpenChange={setIsAddSubOpen}
        userId={user.id}
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
