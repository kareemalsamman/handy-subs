import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Users, DollarSign, Building2, UserCheck, Search, Plus, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CompanyTabs } from "@/components/dashboard/CompanyTabs";
import { UsersTable } from "@/components/dashboard/UsersTable";
import { AddUserDialog } from "@/components/dashboard/AddUserDialog";

export type User = {
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
  }[];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("All Companies");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalCompanies: 5,
    activeUsers: 0,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        fetchData();
      }
    });
  }, [navigate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch users with their domains and subscriptions
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          *,
          domains (*),
          subscriptions (*)
        `)
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      const formattedUsers = usersData || [];
      setUsers(formattedUsers);
      setFilteredUsers(formattedUsers);

      // Calculate stats
      const totalUsers = formattedUsers.length;
      const totalRevenue = formattedUsers.reduce((sum, user) => {
        const latestSub = user.subscriptions?.[0];
        return sum + (latestSub?.c_cost || 0);
      }, 0);
      const activeUsers = formattedUsers.filter(user => 
        user.subscriptions?.some(sub => sub.status === "active")
      ).length;

      setStats({
        totalUsers,
        totalRevenue,
        totalCompanies: 5,
        activeUsers,
      });
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = users;

    // Filter by company
    if (selectedCompany !== "All Companies") {
      filtered = filtered.filter(user => user.company === selectedCompany);
    }

    // Filter by status
    if (selectedStatus !== "All Status") {
      filtered = filtered.filter(user => 
        user.subscriptions?.some(sub => sub.status === selectedStatus.toLowerCase())
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [users, selectedCompany, selectedStatus, searchQuery]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section with Gradient */}
      <div className="bg-gradient-primary px-4 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-white/80 text-sm mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatsCard
            icon={<Users className="h-5 w-5" />}
            label="Total Users"
            value={stats.totalUsers}
            iconBg="bg-blue-500"
          />
          <StatsCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Total Revenue"
            value={`₪${stats.totalRevenue.toFixed(0)}`}
            iconBg="bg-green-500"
          />
          <StatsCard
            icon={<Building2 className="h-5 w-5" />}
            label="Companies"
            value={stats.totalCompanies}
            iconBg="bg-purple-500"
          />
          <StatsCard
            icon={<UserCheck className="h-5 w-5" />}
            label="Active Users"
            value={stats.activeUsers}
            iconBg="bg-orange-500"
          />
        </div>
      </div>

      {/* Filters Section */}
      <div className="px-4 py-6 space-y-4">
        {/* Company Tabs */}
        <CompanyTabs
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
        />

        {/* Search and Actions */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            className="shrink-0"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Status">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-gradient-primary text-white hover:opacity-90 shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="px-4">
        <UsersTable users={filteredUsers} onRefresh={fetchData} />
      </div>

      {/* Add User Dialog */}
      <AddUserDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default Dashboard;
