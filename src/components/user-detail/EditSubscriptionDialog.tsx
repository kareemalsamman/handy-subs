import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [beginDate, setBeginDate] = useState<Date | undefined>();
  const [expireDate, setExpireDate] = useState<Date | undefined>();
  const [formData, setFormData] = useState({
    c_cost: "",
    status: "active",
    buy_domain: false,
    domain_cost: "",
  });

  useEffect(() => {
    if (subscription && open) {
      const domainCost = subscription.domain_cost || 0;
      const beginDateObj = new Date(subscription.begin_date);
      const expireDateObj = new Date(subscription.expire_date);
      
      setBeginDate(beginDateObj);
      setExpireDate(expireDateObj);
      setFormData({
        c_cost: subscription.c_cost.toString(),
        status: subscription.status,
        buy_domain: subscription.buy_domain || domainCost > 0,
        domain_cost: domainCost > 0 ? domainCost.toString() : "",
      });
    }
  }, [subscription, open]);

  // Auto-calculate expire date when begin date changes
  useEffect(() => {
    if (beginDate) {
      const newExpireDate = new Date(beginDate);
      newExpireDate.setFullYear(newExpireDate.getFullYear() + 1);
      setExpireDate(newExpireDate);
    }
  }, [beginDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.c_cost) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.buy_domain && !formData.domain_cost) {
      toast.error("Please enter domain cost");
      return;
    }

    try {
      setIsLoading(true);

      const domainCost = formData.buy_domain ? parseFloat(formData.domain_cost) : 0;
      const cCost = parseFloat(formData.c_cost);
      const oldStatus = subscription.status;

      if (!beginDate || !expireDate) {
        toast.error("Please select begin and expire dates");
        setIsLoading(false);
        return;
      }

      // Format dates correctly in local timezone
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const { error } = await supabase
        .from("subscriptions")
        .update({
          c_cost: cCost,
          domain_cost: domainCost,
          buy_domain: formData.buy_domain,
          begin_date: formatLocalDate(beginDate),
          expire_date: formatLocalDate(expireDate),
          status: formData.status as any,
          cancelled_at: formData.status === 'cancelled' ? new Date().toISOString() : null,
        })
        .eq("id", subscription.id);

      if (error) throw error;

      // Send SMS if status changed to cancelled
      if (oldStatus !== 'cancelled' && formData.status === 'cancelled') {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id, domain_id, domains(domain_url), users(username, phone_number)')
          .eq('id', subscription.id)
          .single();

        if (subData?.users && subData?.domains) {
          const message = `تم إلغاء الاشتراك ❌
عزيزي ${subData.users.username}،
تم إلغاء اشتراكك في ${subData.domains.domain_url}.
إذا كان هناك خطأ، يرجى التواصل معنا.`;

          await supabase.functions.invoke('send-sms', {
            body: {
              phone: subData.users.phone_number,
              message: message
            }
          });
        }
      }

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

  const profit = formData.c_cost
    ? parseFloat(formData.c_cost) - (formData.buy_domain ? parseFloat(formData.domain_cost || "0") : 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="c_cost" className="text-sm font-semibold">
              Customer Yearly Cost (₪) *
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
            <Label htmlFor="begin_date" className="text-sm font-semibold">
              Begin Date *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !beginDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {beginDate ? format(beginDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={beginDate}
                  onSelect={(date) => date && setBeginDate(date)}
                  defaultMonth={beginDate}
                  initialFocus
                  captionLayout="dropdown-buttons"
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="expire_date" className="text-sm font-semibold">
              Expire Date *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !expireDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expireDate ? format(expireDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={expireDate}
                  onSelect={(date) => date && setExpireDate(date)}
                  defaultMonth={expireDate}
                  initialFocus
                  captionLayout="dropdown-buttons"
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="glass p-4 rounded-xl space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="buy_domain"
                checked={formData.buy_domain}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, buy_domain: checked as boolean, domain_cost: checked ? formData.domain_cost : "" })
                }
              />
              <Label 
                htmlFor="buy_domain" 
                className="text-sm font-semibold cursor-pointer"
              >
                I am buying the domain for this customer
              </Label>
            </div>

            {formData.buy_domain && (
              <div>
                <Label htmlFor="domain_cost" className="text-sm font-semibold">
                  Domain Cost (₪)
                </Label>
                <Input
                  id="domain_cost"
                  type="number"
                  step="0.01"
                  value={formData.domain_cost}
                  onChange={(e) => setFormData({ ...formData, domain_cost: e.target.value.replace(/[^0-9.]/g, '') })}
                  placeholder="80"
                  className="mt-1"
                />
              </div>
            )}
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

          {formData.c_cost && beginDate && expireDate && (
            <div className="glass p-4 rounded-lg border border-border">
              <p className="text-sm font-semibold text-foreground mb-2">Calculated:</p>
              <p className="text-xs text-muted-foreground">
                Period: {format(beginDate, "dd/MM/yyyy")} → {format(expireDate, "dd/MM/yyyy")}
              </p>
              <p className="text-xs text-success-text font-medium mt-1">
                Profit: ₪{profit.toFixed(2)}
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
                  Updating...
                </>
              ) : (
                "Update Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
