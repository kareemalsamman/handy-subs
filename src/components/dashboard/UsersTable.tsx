import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ExternalLink, Eye } from "lucide-react";
import { User } from "@/pages/Dashboard";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface UsersTableProps {
  users: User[];
  onRefresh: () => void;
  onEdit: (user: User) => void;
}

interface UsersTableProps {
  users: User[];
  onRefresh: () => void;
  onEdit: (user: User) => void;
}

export const UsersTable = ({ users, onRefresh, onEdit }: UsersTableProps) => {
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!deleteUserId) return;

    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", deleteUserId);

      if (error) throw error;

      toast.success("User deleted successfully");
      onRefresh();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    } finally {
      setDeleteUserId(null);
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

  const getStatusDotColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-success";
      case "expired":
        return "bg-expired-border";
      case "cancelled":
        return "bg-cancelled-border";
      default:
        return "bg-muted-foreground";
    }
  };

  if (users.length === 0) {
    return (
      <div className="bg-card rounded-xl p-8 text-center shadow-sm">
        <p className="text-muted-foreground text-sm">No users found</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {users.map((user) => {
          const latestSub = user.subscriptions?.[0];
          
          return (
            <div
              key={user.id}
              className="glass rounded-xl p-4 hover:shadow-lg transition-all duration-normal animate-fade-in cursor-pointer"
              onClick={() => navigate(`/user/${user.id}`)}
            >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base text-foreground">{user.username}</h3>
                  {latestSub && (
                    <span className={cn("w-2 h-2 rounded-full", getStatusDotColor(latestSub.status))} />
                  )}
                </div>
                <Badge variant="secondary" className="text-xs font-medium border">
                  {user.company}
                </Badge>
              </div>
                <div className="flex gap-1">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 hover:bg-secondary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/${user.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 hover:bg-secondary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(user);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteUserId(user.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
            </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>📱</span>
                    <span className="font-medium">{user.phone_number}</span>
                  </div>
                  
                  {user.domains && user.domains.length > 0 && (
                    <div className="space-y-1">
                      {user.domains.map((domain, idx) => (
                        <div key={domain.id} className="flex items-center gap-2 text-primary">
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          <a 
                            href={domain.domain_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline font-medium text-xs truncate"
                          >
                            {domain.domain_url}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {latestSub && (
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">C-COST</p>
                        <p className="font-semibold text-foreground">₪{latestSub.c_cost}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">PROFIT</p>
                        <p className="font-semibold text-success-text">₪{latestSub.profit?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">EXPIRES</p>
                        <p className="font-semibold text-foreground text-xs">
                          {new Date(latestSub.expire_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">STATUS</p>
                        <Badge 
                          className={cn(
                            "text-xs font-semibold border capitalize",
                            getStatusBadgeClasses(latestSub.status)
                          )}
                        >
                          {latestSub.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
          <AlertDialogContent className="glass-strong">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this user? This action cannot be undone and will delete all associated domains and subscriptions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };
