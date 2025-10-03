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
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-500";
      case "expired":
        return "bg-amber-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center shadow-sm">
        <p className="text-muted-foreground">No users found</p>
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
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base">{user.username}</h3>
                  {latestSub && (
                    <span className={cn("w-2 h-2 rounded-full", getStatusColor(latestSub.status))} />
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {user.company}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>📱</span>
                <span>{user.phone_number}</span>
              </div>
              
              {domain && (
                <div className="flex items-center gap-2 text-primary">
                  <ExternalLink className="h-4 w-4" />
                  <a href={domain.domain_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {domain.domain_url}
                  </a>
                </div>
              )}

              {latestSub && (
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">C-COST</p>
                    <p className="font-semibold">₪{latestSub.c_cost}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">PROFIT</p>
                    <p className="font-semibold text-success">₪{latestSub.profit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">EXPIRES</p>
                    <p className="font-semibold">{new Date(latestSub.expire_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">STATUS</p>
                    <Badge 
                      className={cn(
                        "text-xs",
                        latestSub.status === "active" && "bg-success",
                        latestSub.status === "expired" && "bg-warning",
                        latestSub.status === "cancelled" && "bg-destructive"
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
