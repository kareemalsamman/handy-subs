import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ExternalLink } from "lucide-react";
import { User } from "@/pages/Dashboard";
import { cn } from "@/lib/utils";

interface UsersTableProps {
  users: User[];
  onRefresh: () => void;
}

export const UsersTable = ({ users }: UsersTableProps) => {
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
    <div className="space-y-3">
      {users.map((user) => {
        const latestSub = user.subscriptions?.[0];
        const domain = user.domains?.[0];
        
        return (
          <div
            key={user.id}
            className="bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-normal animate-fade-in"
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
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
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
              
              {domain && (
                <div className="flex items-center gap-2 text-primary">
                  <ExternalLink className="h-4 w-4" />
                  <a 
                    href={domain.domain_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:underline font-medium"
                  >
                    {domain.domain_url}
                  </a>
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
                    <p className="font-semibold text-success-text">₪{latestSub.profit}</p>
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
  );
};
