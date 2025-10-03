import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddUserDialog = ({ open, onOpenChange, onSuccess }: AddUserDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    company: "Ajad",
    phone_number: "",
    domain_url: "",
    c_cost: "",
    m_cost: "",
    begin_date: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.phone_number || !formData.domain_url || !formData.c_cost || !formData.m_cost) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsLoading(true);

      // Create user
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert([{
          username: formData.username,
          company: formData.company as any,
          phone_number: formData.phone_number,
        }])
        .select()
        .single();

      if (userError) throw userError;

      // Create domain
      const { error: domainError } = await supabase
        .from("domains")
        .insert({
          user_id: userData.id,
          domain_url: formData.domain_url,
        });

      if (domainError) throw domainError;

      // Create subscription
      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userData.id,
          c_cost: parseFloat(formData.c_cost),
          m_cost: parseFloat(formData.m_cost),
          begin_date: formData.begin_date,
        });

      if (subError) throw subError;

      toast.success("User added successfully!");
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        username: "",
        company: "Ajad",
        phone_number: "",
        domain_url: "",
        c_cost: "",
        m_cost: "",
        begin_date: new Date().toISOString().split("T")[0],
      });
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(error.message || "Failed to add user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Add New User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-sm font-semibold">Username *</Label>
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
            <Label htmlFor="company" className="text-sm font-semibold">Company *</Label>
            <Select value={formData.company} onValueChange={(value) => setFormData({ ...formData, company: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
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
            <Label htmlFor="phone" className="text-sm font-semibold">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="05X-XXX-XXXX"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="domain" className="text-sm font-semibold">Domain URL *</Label>
            <Input
              id="domain"
              type="url"
              value={formData.domain_url}
              onChange={(e) => setFormData({ ...formData, domain_url: e.target.value })}
              placeholder="https://example.com"
              className="mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="c_cost" className="text-sm font-semibold">C-COST (₪) *</Label>
              <Input
                id="c_cost"
                type="number"
                step="0.01"
                value={formData.c_cost}
                onChange={(e) => setFormData({ ...formData, c_cost: e.target.value })}
                placeholder="0.00"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="m_cost" className="text-sm font-semibold">M-COST (₪) *</Label>
              <Input
                id="m_cost"
                type="number"
                step="0.01"
                value={formData.m_cost}
                onChange={(e) => setFormData({ ...formData, m_cost: e.target.value })}
                placeholder="0.00"
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="begin_date" className="text-sm font-semibold">Begin Date *</Label>
            <Input
              id="begin_date"
              type="date"
              value={formData.begin_date}
              onChange={(e) => setFormData({ ...formData, begin_date: e.target.value })}
              className="mt-1"
              required
            />
          </div>

          {formData.c_cost && formData.m_cost && (
            <div className="p-4 bg-secondary rounded-lg border border-border">
              <p className="text-sm font-semibold text-foreground mb-2">Auto-calculated:</p>
              <p className="text-xs text-muted-foreground">
                Expire Date: {new Date(new Date(formData.begin_date).getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
              <p className="text-xs text-success-text font-medium">
                Profit: ₪{(parseFloat(formData.c_cost) - parseFloat(formData.m_cost) * 12).toFixed(2)}
              </p>
            </div>
          )}

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
              className="flex-1 bg-gradient-primary text-white hover:shadow-button-hover transition-all duration-normal"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save User"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
