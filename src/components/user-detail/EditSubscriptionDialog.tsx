import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: any;
  onSuccess: () => void;
}

export const EditSubscriptionDialog = ({
  open,
  onOpenChange,
  subscription,
  onSuccess,
}: EditSubscriptionDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    c_cost: "",
    m_cost: "",
    begin_date: "",
    status: "active",
  });

  useEffect(() => {
    if (subscription && open) {
      setFormData({
        c_cost: subscription.c_cost.toString(),
        m_cost: subscription.m_cost.toString(),
        begin_date: subscription.begin_date,
        status: subscription.status,
      });
    }
  }, [subscription, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.c_cost || !formData.m_cost) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          c_cost: parseFloat(formData.c_cost),
          m_cost: parseFloat(formData.m_cost),
          begin_date: formData.begin_date,
          status: formData.status as any,
        })
        .eq("id", subscription.id);

      if (error) throw error;

      toast.success("Subscription updated successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      toast.error(error.message || "Failed to update subscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Subscription</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="c_cost" className="text-sm font-semibold">
                C-COST (₪) *
              </Label>
              <Input
                id="c_cost"
                type="number"
                step="0.01"
                value={formData.c_cost}
                onChange={(e) => setFormData({ ...formData, c_cost: e.target.value })}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="m_cost" className="text-sm font-semibold">
                M-COST (₪) *
              </Label>
              <Input
                id="m_cost"
                type="number"
                step="0.01"
                value={formData.m_cost}
                onChange={(e) => setFormData({ ...formData, m_cost: e.target.value })}
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="begin_date" className="text-sm font-semibold">
              Begin Date *
            </Label>
            <Input
              id="begin_date"
              type="date"
              value={formData.begin_date}
              onChange={(e) => setFormData({ ...formData, begin_date: e.target.value })}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="status" className="text-sm font-semibold">
              Status
            </Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
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
              className="flex-1 gradient-primary text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
