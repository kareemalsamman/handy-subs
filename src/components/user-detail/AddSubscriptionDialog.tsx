import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export const AddSubscriptionDialog = ({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: AddSubscriptionDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    c_cost: "",
    m_cost: "",
    domain_cost: "0",
    begin_date: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.c_cost || !formData.m_cost) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase.from("subscriptions").insert({
        user_id: userId,
        c_cost: parseFloat(formData.c_cost),
        m_cost: parseFloat(formData.m_cost),
        begin_date: formData.begin_date,
      });

      if (error) throw error;

      toast.success("Subscription added successfully!");
      onSuccess();
      onOpenChange(false);
      setFormData({
        c_cost: "",
        m_cost: "",
        domain_cost: "0",
        begin_date: new Date().toISOString().split("T")[0],
      });
    } catch (error: any) {
      console.error("Error adding subscription:", error);
      toast.error(error.message || "Failed to add subscription");
    } finally {
      setIsLoading(false);
    }
  };

  const profit =
    formData.c_cost && formData.m_cost
      ? parseFloat(formData.c_cost) -
        parseFloat(formData.m_cost) * 12 -
        parseFloat(formData.domain_cost || "0")
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Subscription</DialogTitle>
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
                placeholder="1000"
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
                placeholder="50"
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="domain_cost" className="text-sm font-semibold">
              Domain Cost (₪)
            </Label>
            <Input
              id="domain_cost"
              type="number"
              step="0.01"
              value={formData.domain_cost}
              onChange={(e) => setFormData({ ...formData, domain_cost: e.target.value })}
              placeholder="80"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave 0 if no domain purchased
            </p>
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

          {formData.c_cost && formData.m_cost && (
            <div className="glass p-4 rounded-lg border border-border">
              <p className="text-sm font-semibold text-foreground mb-2">Calculated:</p>
              <p className="text-xs text-muted-foreground">
                Expire: {new Date(new Date(formData.begin_date).getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
              <p className="text-xs text-success-text font-medium mt-1">
                Profit: ₪{profit.toFixed(2)} (before server cost)
              </p>
            </div>
          )}

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
                  Adding...
                </>
              ) : (
                "Add Subscription"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
