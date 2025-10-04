import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  domains: { id: string; domain_url: string }[];
  onSuccess: () => void;
}

export const AddSubscriptionDialog = ({ open, onOpenChange, userId, domains, onSuccess }: AddSubscriptionDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [beginDate, setBeginDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    domain_id: "",
    c_cost: "",
    buy_domain: false,
    domain_cost: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.domain_id) {
      toast.error("Please select a domain");
      return;
    }

    setIsLoading(true);

    try {
      // Mark old active subscriptions for this domain as "done"
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ status: "done" })
        .eq("domain_id", formData.domain_id)
        .eq("status", "active");

      if (updateError) throw updateError;

      const expireDate = new Date(beginDate);
      expireDate.setFullYear(expireDate.getFullYear() + 1);

      const cCost = parseFloat(formData.c_cost);
      const domainCost = formData.buy_domain ? parseFloat(formData.domain_cost || "0") : 0;

      const { data: subscriptionData, error: subError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          domain_id: formData.domain_id,
          c_cost: cCost,
          begin_date: beginDate.toISOString().split('T')[0],
          expire_date: expireDate.toISOString().split('T')[0],
          status: "active",
          buy_domain: formData.buy_domain,
          domain_cost: domainCost,
        })
        .select()
        .single();

      if (subError) throw subError;

      // Send payment confirmation SMS
      const { data: userData } = await supabase
        .from('users')
        .select('username, phone_number')
        .eq('id', userId)
        .single();

      const { data: domainData } = await supabase
        .from('domains')
        .select('domain_url')
        .eq('id', formData.domain_id)
        .single();

      if (userData && domainData) {
        const expireDate = new Date(beginDate);
        expireDate.setFullYear(expireDate.getFullYear() + 1);
        const formattedDate = format(expireDate, "dd/MM/yyyy");
        
        const message = `تم استلام الدفع بنجاح! ✅
عزيزي ${userData.username}،
تم تسجيل دفعتك في النظام.
النطاق: ${domainData.domain_url}
المبلغ: ${cCost} ₪
الاشتراك الجديد ينتهي: ${formattedDate}
شكراً لك! 🙏`;

        await supabase.functions.invoke('send-sms', {
          body: {
            phone: userData.phone_number,
            message: message
          }
        });
      }

      toast.success("Subscription added and SMS sent successfully");
      onOpenChange(false);
      onSuccess();
      
      setBeginDate(new Date());
      setFormData({
        domain_id: "",
        c_cost: "",
        buy_domain: false,
        domain_cost: "",
      });
    } catch (error: any) {
      console.error("Error adding subscription:", error);
      toast.error(error.message || "Failed to add subscription");
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
          <DialogTitle className="text-xl font-bold">Add Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="domain" className="text-sm font-semibold">
              Select Domain
            </Label>
            <Select
              value={formData.domain_id}
              onValueChange={(value) => setFormData({ ...formData, domain_id: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose a domain" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.domain_url}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="c_cost" className="text-sm font-semibold">
              Customer Yearly Cost (₪)
            </Label>
            <Input
              id="c_cost"
              type="number"
              step="0.01"
              value={formData.c_cost}
              onChange={(e) => setFormData({ ...formData, c_cost: e.target.value })}
              required
              className="mt-2"
              placeholder="1000"
            />
          </div>

          <div>
            <Label htmlFor="begin_date" className="text-sm font-semibold">
              Begin Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
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
                  initialFocus
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
                  className="mt-2"
                />
              </div>
            )}
          </div>

          {formData.c_cost && beginDate && (
            <div className="glass p-4 rounded-lg border border-border">
              <p className="text-sm font-semibold text-foreground mb-2">Calculated:</p>
              <p className="text-xs text-muted-foreground">
                Expire: {(() => {
                  const expireDate = new Date(beginDate);
                  expireDate.setFullYear(expireDate.getFullYear() + 1);
                  return format(expireDate, "dd/MM/yyyy");
                })()}
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
                  Adding...
                </>
              ) : (
                "Add Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
