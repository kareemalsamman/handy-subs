import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ExternalLink, Eye, MessageCircle, Clock } from "lucide-react";
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

  const getDaysUntilExpire = (expireDate: string) => {
    const now = new Date();
    const expire = new Date(expireDate);
    const diffTime = expire.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <>
      <div className="space-y-3">
        {users.map((user) => {
          const activeSubs = user.subscriptions?.filter(sub => sub.status === 'active') || [];
          const hasExpiringSoon = activeSubs.some(sub => {
            const daysLeft = getDaysUntilExpire(sub.expire_date);
            return daysLeft >= 0 && daysLeft <= 30;
          });
          
          return (
            <div
              key={user.id}
              className="glass rounded-xl p-4 hover:shadow-lg transition-all duration-normal animate-fade-in cursor-pointer relative"
              onClick={() => navigate(`/user/${user.id}`)}
            >
              {hasExpiringSoon && (
                <div className="absolute top-2 right-2">
                  <Badge variant="destructive" className="text-xs font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {(() => {
                      const soonestExpiring = activeSubs
                        .map(sub => ({ sub, days: getDaysUntilExpire(sub.expire_date) }))
                        .filter(item => item.days >= 0 && item.days <= 30)
                        .sort((a, b) => a.days - b.days)[0];
                      return soonestExpiring ? `${soonestExpiring.days}d` : '';
                    })()}
                  </Badge>
                </div>
              )}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base text-foreground">{user.username}</h3>
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
                  <div className="flex items-center gap-2">
                    <a 
                      href={`tel:${user.phone_number}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>📱</span>
                      <span className="font-medium">{user.phone_number}</span>
                    </a>
                    <a
                      href={(() => {
                        const digits = user.phone_number.replace(/\D/g, '');
                        const phoneNumber = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
                        return `https://wa.me/${phoneNumber}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-success text-success-foreground hover:opacity-90"
                      aria-label="Open WhatsApp chat"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                  
                  {/* Display subscriptions grouped by domain */}
                  {user.subscriptions && user.subscriptions.length > 0 && (
                    <div className="space-y-3 mt-3">
                      {user.domains?.map((domain) => {
                        const domainSubs = user.subscriptions.filter(sub => sub.domain_id === domain.id);
                        const activeSub = domainSubs.find(sub => sub.status === 'active');
                        const displaySub = activeSub || domainSubs[0];
                        
                        if (!displaySub) return null;
                        
                        const daysLeft = getDaysUntilExpire(displaySub.expire_date);
                        const isExpiringSoon = displaySub.status === 'active' && daysLeft >= 0 && daysLeft <= 30;
                        
                        return (
                          <div key={domain.id} className="border-t border-border pt-3">
                            <div className="flex items-center gap-2 text-primary mb-2">
                              <ExternalLink className="h-4 w-4 shrink-0" />
                              <a 
                                href={domain.domain_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:underline font-medium text-xs truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {domain.domain_url}
                              </a>
                              {isExpiringSoon && (
                                <Badge variant="destructive" className="text-xs">
                                  {daysLeft}d left
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">YEARLY PAY</p>
                                <p className="font-semibold text-foreground">₪{displaySub.c_cost}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">BEGIN</p>
                                <p className="font-semibold text-foreground text-xs">
                                  {(() => {
                                    const date = new Date(displaySub.begin_date);
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
                                    const date = new Date(displaySub.expire_date);
                                    const day = date.getDate().toString().padStart(2, '0');
                                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                    const year = date.getFullYear();
                                    return `${day}/${month}/${year}`;
                                  })()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">STATUS</p>
                                <Badge 
                                  className={cn(
                                    "text-xs font-semibold border capitalize",
                                    getStatusBadgeClasses(displaySub.status)
                                  )}
                                >
                                  {displaySub.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
