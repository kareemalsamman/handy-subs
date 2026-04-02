import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft, Plus, Trash2, Edit, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useCategories } from "@/hooks/useCategories";

const Settings = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    server_monthly_cost: "504",
    admin_phone: "0525143581",
    auto_messages_enabled: true,
    admin_pin: "1997",
  });
  const [financialStats, setFinancialStats] = useState({
    totalRevenue: 0,
    totalDomainCosts: 0,
    totalServerCost: 0,
    totalProfit: 0,
  });

  // Categories management
  const { categories, saveCategories, refetch: refetchCategories } = useCategories();
  const [editingCategories, setEditingCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    setEditingCategories([...categories]);
  }, [categories]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          server_monthly_cost: data.server_monthly_cost.toString(),
          admin_phone: data.admin_phone,
          auto_messages_enabled: data.auto_messages_enabled ?? true,
          admin_pin: data.admin_pin || "1997",
        });

        await calculateFinancialStats(data.server_monthly_cost);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateFinancialStats = async (monthlyServerCost: number) => {
    try {
      const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select("c_cost, domain_cost, buy_domain")
        .eq("status", "active");

      if (error) throw error;

      const totalRevenue = subscriptions?.reduce((sum, sub) => sum + Number(sub.c_cost), 0) || 0;
      const totalDomainCosts = subscriptions?.reduce((sum, sub) =>
        sum + (sub.buy_domain ? Number(sub.domain_cost || 0) : 0), 0) || 0;
      const totalServerCost = monthlyServerCost * 12;
      const totalProfit = totalRevenue - totalDomainCosts - totalServerCost;

      setFinancialStats({
        totalRevenue,
        totalDomainCosts,
        totalServerCost,
        totalProfit,
      });
    } catch (error: any) {
      console.error("Error calculating financial stats:", error);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const { data: existingSettings } = await supabase
        .from("settings")
        .select("id")
        .single();

      if (existingSettings) {
        const { error } = await supabase
          .from("settings")
          .update({
            server_monthly_cost: parseFloat(settings.server_monthly_cost),
            admin_phone: settings.admin_phone,
            auto_messages_enabled: settings.auto_messages_enabled,
            admin_pin: settings.admin_pin,
          })
          .eq("id", existingSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({
            server_monthly_cost: parseFloat(settings.server_monthly_cost),
            admin_phone: settings.admin_phone,
            auto_messages_enabled: settings.auto_messages_enabled,
            admin_pin: settings.admin_pin,
          });

        if (error) throw error;
      }

      toast.success("Settings saved successfully!");
      await calculateFinancialStats(parseFloat(settings.server_monthly_cost));
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Category management handlers
  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (editingCategories.includes(trimmed)) {
      toast.error("Category already exists");
      return;
    }
    setEditingCategories([...editingCategories, trimmed]);
    setNewCategory("");
  };

  const handleRemoveCategory = (index: number) => {
    setEditingCategories(editingCategories.filter((_, i) => i !== index));
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(editingCategories[index]);
  };

  const handleConfirmEdit = () => {
    if (editingIndex === null) return;
    const trimmed = editingText.trim();
    if (!trimmed) return;
    if (editingCategories.some((cat, i) => i !== editingIndex && cat === trimmed)) {
      toast.error("Category already exists");
      return;
    }
    const updated = [...editingCategories];
    updated[editingIndex] = trimmed;
    setEditingCategories(updated);
    setEditingIndex(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingText("");
  };

  const handleSaveCategories = async () => {
    if (editingCategories.length === 0) {
      toast.error("Must have at least one category");
      return;
    }
    try {
      setIsSavingCategories(true);
      await saveCategories(editingCategories);
      toast.success("Categories saved!");
    } catch (error: any) {
      console.error("Error saving categories:", error);
      toast.error(error.message || "Failed to save categories");
    } finally {
      setIsSavingCategories(false);
    }
  };

  const categoriesChanged = JSON.stringify(editingCategories) !== JSON.stringify(categories);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-white/90 text-sm mt-1">Configure system settings</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-4">
        <Card className="glass-strong p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Server Configuration</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="server_cost" className="text-sm font-semibold">
                Monthly Server Cost (₪)
              </Label>
              <Input
                id="server_cost"
                type="number"
                step="0.01"
                value={settings.server_monthly_cost}
                onChange={(e) =>
                  setSettings({ ...settings, server_monthly_cost: e.target.value })
                }
                placeholder="504"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Total monthly hosting cost for all users
              </p>
            </div>

            <div>
              <Label htmlFor="admin_phone" className="text-sm font-semibold">
                Admin Phone Number
              </Label>
              <Input
                id="admin_phone"
                type="tel"
                value={settings.admin_phone}
                onChange={(e) =>
                  setSettings({ ...settings, admin_phone: e.target.value })
                }
                placeholder="0525143581"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Phone number for admin notifications
              </p>
            </div>

            <div>
              <Label htmlFor="admin_pin" className="text-sm font-semibold">
                Admin PIN (4 digits)
              </Label>
              <Input
                id="admin_pin"
                type="text"
                maxLength={4}
                value={settings.admin_pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setSettings({ ...settings, admin_pin: value });
                }}
                placeholder="1997"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                4-digit PIN for admin authentication
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="glass p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-3">Yearly Financial Overview</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Revenue (Active Subscriptions):</span>
                  <span className="text-sm font-semibold text-success-text">₪{financialStats.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Domain Costs:</span>
                  <span className="text-sm font-semibold text-destructive">₪{financialStats.totalDomainCosts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Server Cost (Monthly × 12):</span>
                  <span className="text-sm font-semibold text-destructive">₪{financialStats.totalServerCost.toFixed(2)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">Total Yearly Profit:</span>
                  <span className={`text-lg font-bold ${financialStats.totalProfit >= 0 ? 'text-success-text' : 'text-destructive'}`}>
                    ₪{financialStats.totalProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gradient-primary text-white hover:shadow-lg transition-all duration-normal w-full mt-6"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </Card>

        {/* Categories Management */}
        <Card className="glass-strong p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Categories</h2>

          <div className="space-y-3">
            {editingCategories.map((cat, index) => (
              <div key={index} className="flex items-center gap-2">
                {editingIndex === index ? (
                  <>
                    <Input
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirmEdit();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={handleConfirmEdit}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium">
                      {cat}
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(index)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRemoveCategory(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}

            {/* Add new category */}
            <div className="flex gap-2 pt-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCategory}
                disabled={!newCategory.trim()}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {categoriesChanged && (
              <Button
                onClick={handleSaveCategories}
                disabled={isSavingCategories}
                className="w-full gradient-primary text-white mt-2"
              >
                {isSavingCategories ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Categories
              </Button>
            )}
          </div>
        </Card>

        {/* Auto Messages Settings */}
        <Card className="glass-strong p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Auto SMS Notifications</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="auto-messages" className="text-sm font-semibold">
                  Enable Auto Messages
                </Label>
                <p className="text-xs text-muted-foreground">
                  Send automatic SMS reminders for subscription expiration
                </p>
              </div>
              <Switch
                id="auto-messages"
                checked={settings.auto_messages_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_messages_enabled: checked })
                }
              />
            </div>

            <div className="glass p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-2">Reminder Schedule</h3>
              <p className="text-xs text-muted-foreground">
                • 1 month before subscription expires
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                • 1 week before subscription expires
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                • Reminders are sent to both users and admin
              </p>
            </div>

            <div className="glass p-4 rounded-lg bg-amber-500/10 border-amber-500/20">
              <h3 className="text-sm font-semibold text-foreground mb-2">Important</h3>
              <p className="text-xs text-muted-foreground">
                When disabled, no automatic SMS reminders will be sent for subscription expiration. You will need to track and contact users manually.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
