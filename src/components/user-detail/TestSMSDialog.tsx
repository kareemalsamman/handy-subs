import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TestSMSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    username: string;
    phone_number: string;
    domains?: { domain_url: string }[];
    subscriptions?: { c_cost: number; expire_date: string }[];
  };
}

export const TestSMSDialog = ({ open, onOpenChange, user }: TestSMSDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [messageType, setMessageType] = useState("1_month_reminder");
  const [customMessage, setCustomMessage] = useState("");

  const getMessageTemplate = (type: string) => {
    const latestSub = user.subscriptions?.[0];
    const domain = user.domains?.[0]?.domain_url || "your domain";
    const expireDate = latestSub?.expire_date
      ? new Date(latestSub.expire_date).toLocaleDateString("ar-EG")
      : "التاريخ";
    const cCost = latestSub?.c_cost || "0";

    switch (type) {
      case "1_month_reminder":
        return `تذكير! 🔔
عزيزي ${user.username}،
اشتراكك في ${domain} سينتهي خلال شهر واحد.
تاريخ الانتهاء: ${expireDate}
المبلغ السنوي: ${cCost} ₪
الرجاء التواصل للتجديد قريباً.`;

      case "1_week_reminder":
        return `تنبيه هام! ⚠️
عزيزي ${user.username}،
اشتراكك في ${domain} سينتهي خلال أسبوع!
تاريخ الانتهاء: ${expireDate}
المبلغ السنوي: ${cCost} ₪
يرجى التجديد في أقرب وقت.`;

      case "payment_received":
        return `تم استلام الدفع بنجاح! ✅
عزيزي ${user.username}،
تم تسجيل دفعتك في النظام.
المبلغ: ${cCost} ₪
الاشتراك الجديد ينتهي: ${expireDate}
شكراً لك! 🙏`;

      case "subscription_cancelled":
        return `إلغاء الاشتراك 🔴
عزيزي ${user.username}،
تم إلغاء اشتراكك في ${domain}.
إذا كان هذا خطأ، يرجى التواصل معنا فوراً.
شكراً لاستخدامك خدماتنا.`;

      default:
        return "";
    }
  };

  const handleSendTest = async () => {
    try {
      setIsLoading(true);

      const message = messageType === "custom" ? customMessage : getMessageTemplate(messageType);

      if (!message.trim()) {
        toast.error("Please enter a message");
        return;
      }

      // Call the SMS edge function
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: user.phone_number,
          message: message
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Test SMS sent successfully!");
        onOpenChange(false);
      } else {
        throw new Error(data?.error || "Failed to send SMS");
      }
    } catch (error: any) {
      console.error("Error sending test SMS:", error);
      toast.error(error.message || "Failed to send test SMS");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Test SMS Notifications</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Message Type</Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="1_month_reminder">1 Month Reminder</SelectItem>
                <SelectItem value="1_week_reminder">1 Week Reminder</SelectItem>
                <SelectItem value="payment_received">Payment Received</SelectItem>
                <SelectItem value="subscription_cancelled">Subscription Cancelled</SelectItem>
                <SelectItem value="custom">Custom Message</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {messageType === "custom" ? (
            <div>
              <Label className="text-sm font-semibold">Custom Message</Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your custom message..."
                className="mt-2 min-h-[150px]"
              />
            </div>
          ) : (
            <div>
              <Label className="text-sm font-semibold">Preview</Label>
              <div className="mt-2 p-4 glass rounded-lg border border-border">
                <p className="text-sm whitespace-pre-wrap text-right">{getMessageTemplate(messageType)}</p>
              </div>
            </div>
          )}

          <div className="glass p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Send to:</strong> {user.phone_number}
            </p>
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
              onClick={handleSendTest}
              className="flex-1 gradient-primary text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Test SMS"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
