import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const CheckSubscriptionReminders = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const checkReminders = async () => {
      setStatus("Checking subscription reminders...");
      
      try {
        const { data, error } = await supabase.functions.invoke('check-reminders', {
          body: {}
        });

        if (error) {
          throw error;
        }

        setResult(data);
        setStatus(`✓ Check complete! 
1-Month Reminders: ${data.oneMonthReminders || 0}
1-Week Reminders: ${data.oneWeekReminders || 0}`);
      } catch (error) {
        console.error("Error checking reminders:", error);
        setStatus(`✗ Error: ${error instanceof Error ? error.message : 'Failed to check reminders'}`);
      }

      setIsLoading(false);
    };

    checkReminders();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md">
        {isLoading && (
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        )}
        <pre className="text-sm text-foreground whitespace-pre-wrap">{status}</pre>
        {result && !isLoading && (
          <div className="text-xs text-muted-foreground mt-4 p-4 bg-muted rounded-md">
            <p>Success: {result.success ? '✓' : '✗'}</p>
            {result.message && <p>Message: {result.message}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckSubscriptionReminders;
