import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { User } from "@/pages/Dashboard";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user: User | null;
}

export const EditUserDialog = ({ open, onOpenChange, onSuccess, user }: EditUserDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    company: "Others",
    phone_number: "",
    domains: [""],
  });

  useEffect(() => {
    if (user && open) {
      setFormData({
        username: user.username,
        company: user.company,
        phone_number: user.phone_number,
        domains: user.domains?.map((d) => d.domain_url.replace(/^https?:\/\//, "")) || [""],
      });
    }
  }, [user, open]);

  const formatDomain = (url: string) => {
    if (!url) return "";
    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return `https://${url}`;
    }
    return url;
  };

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length <= 10 ? cleaned : cleaned.slice(0, 10);
  };

  const addDomain = () => {
    setFormData({ ...formData, domains: [...formData.domains, ""] });
  };

  const removeDomain = (index: number) => {
    const newDomains = formData.domains.filter((_, i) => i !== index);
    setFormData({ ...formData, domains: newDomains.length ? newDomains : [""] });
  };

  const updateDomain = (index: number, value: string) => {
    const newDomains = [...formData.domains];
    newDomains[index] = value;
    setFormData({ ...formData, domains: newDomains });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.phone_number) {
      toast.error("Please fill in all required fields");
      return;
    }

    const validDomains = formData.domains.filter((d) => d.trim());
    if (validDomains.length === 0) {
      toast.error("Please add at least one domain");
      return;
    }

    try {
      setIsLoading(true);

      // Update user
      const { error: userError } = await supabase
        .from("users")
        .update({
          username: formData.username,
          company: formData.company as any,
          phone_number: formData.phone_number,
        })
        .eq("id", user!.id);

      if (userError) throw userError;

      // Update or insert domains without deleting to preserve subscriptions
      const existingDomains = user?.domains || [];
      const formattedDomains = validDomains.map((d) => formatDomain(d));

      // Update existing domains (by index)
      for (let i = 0; i < Math.min(existingDomains.length, formattedDomains.length); i++) {
        const current = existingDomains[i];
        const newUrl = formattedDomains[i];
        if (current.domain_url !== newUrl) {
          const { error: updateDomainError } = await supabase
            .from("domains")
            .update({ domain_url: newUrl })
            .eq("id", current.id);
          if (updateDomainError) throw updateDomainError;
        }
      }

      // Insert any extra domains provided
      if (formattedDomains.length > existingDomains.length) {
        const toInsert = formattedDomains.slice(existingDomains.length).map((d) => ({
          user_id: user!.id,
          domain_url: d,
        }));
        const { error: insertError } = await supabase.from("domains").insert(toInsert);
        if (insertError) throw insertError;
      }

      toast.success("User updated successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto glass-strong">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Edit User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-sm font-semibold">
              Username *
            </Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Enter username"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="company" className="text-sm font-semibold">
              Company *
            </Label>
            <Select value={formData.company} onValueChange={(value) => setFormData({ ...formData, company: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="Ajad">Ajad</SelectItem>
                <SelectItem value="Soft">Soft</SelectItem>
                <SelectItem value="Spex">Spex</SelectItem>
                <SelectItem value="Almas">Almas</SelectItem>
                <SelectItem value="Others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-semibold">
              Phone Number *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: validatePhone(e.target.value) })}
              placeholder="0501234567"
              className="mt-1"
              maxLength={10}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Only numbers, max 10 digits</p>
          </div>

          <div>
            <Label className="text-sm font-semibold">Domain URLs *</Label>
            {formData.domains.map((domain, index) => (
              <div key={index} className="flex gap-2 mt-2">
                <Input
                  type="text"
                  value={domain}
                  onChange={(e) => updateDomain(index, e.target.value)}
                  placeholder="example.com"
                  className="flex-1"
                />
                {formData.domains.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeDomain(index)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addDomain} className="mt-2 w-full">
              <Plus className="h-4 w-4 mr-1" />
              Add Domain
            </Button>
            <p className="text-xs text-muted-foreground mt-1">https:// will be added automatically</p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-primary text-white hover:shadow-lg transition-all duration-normal"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update User"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
