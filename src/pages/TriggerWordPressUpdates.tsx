import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const TriggerWordPressUpdates = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const triggerUpdates = async () => {
      // Get trigger API URL from settings
      const { data: settings } = await supabase
        .from("settings")
        .select("trigger_api_url")
        .single();

      const apiUrl = settings?.trigger_api_url || "https://kareemsamman.com/trigger_updates/";

      // Fetch all domains with WordPress configured
      setStatus("Fetching domains...");
      const { data: domains, error } = await supabase
        .from("domains")
        .select("*")
        .not("wordpress_secret_key", "is", null);

      if (error || !domains) {
        toast({
          title: "Error",
          description: "Failed to fetch domains",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Send domains to external API
      setStatus(`Sending ${domains.length} domains to trigger API...`);
      
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domains }),
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: `Successfully sent ${domains.length} domains to trigger API`,
          });
          setStatus(`✓ Successfully triggered updates for ${domains.length} domains`);
        } else {
          throw new Error(`API returned status: ${response.status}`);
        }
      } catch (error) {
        console.error("Error triggering updates:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to trigger updates",
          variant: "destructive",
        });
        setStatus("✗ Failed to trigger updates");
      }

      setIsLoading(false);
    };

    triggerUpdates();
  }, [toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {isLoading && (
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        )}
        <p className="text-lg text-foreground">{status}</p>
        {!isLoading && (
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default TriggerWordPressUpdates;
