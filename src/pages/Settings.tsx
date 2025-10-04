import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    server_monthly_cost: "504",
    admin_phone: "0525143581",
    auto_wordpress_updates_enabled: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

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
          auto_wordpress_updates_enabled: data.auto_wordpress_updates_enabled || false,
        });
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
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
            auto_wordpress_updates_enabled: settings.auto_wordpress_updates_enabled,
          })
          .eq("id", existingSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({
            server_monthly_cost: parseFloat(settings.server_monthly_cost),
            admin_phone: settings.admin_phone,
            auto_wordpress_updates_enabled: settings.auto_wordpress_updates_enabled,
          });

        if (error) throw error;
      }

      toast.success("Settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
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
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="glass p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-2">Profit Calculation</h3>
              <p className="text-xs text-muted-foreground">
                Profit = C-COST - Domain Cost - (Server Cost ÷ Total Active Users)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Current server cost per user: ₪{(parseFloat(settings.server_monthly_cost) / 12).toFixed(2)}/month
              </p>
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

        {/* WordPress Auto-Updates Settings */}
        <Card className="glass-strong p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">WordPress Auto-Updates</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="auto-updates" className="text-sm font-semibold">
                  Enable Automatic Updates
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically update all WordPress sites every Sunday at 2:00 AM
                </p>
              </div>
              <Switch
                id="auto-updates"
                checked={settings.auto_wordpress_updates_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_wordpress_updates_enabled: checked })
                }
              />
            </div>

            <div className="glass p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-2">Schedule Information</h3>
              <p className="text-xs text-muted-foreground">
                • Updates run every Sunday at 2:00 AM UTC
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                • All configured WordPress sites will be updated automatically
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                • You can manually check and update sites anytime from user detail pages
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
