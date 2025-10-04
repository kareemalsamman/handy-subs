import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddWordPressSiteDialogProps {
  userId: string;
  domains: Array<{ id: string; domain_url: string; wordpress_secret_key?: string }>;
  onSuccess: () => void;
}

export function AddWordPressSiteDialog({ userId, domains, onSuccess }: AddWordPressSiteDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [secretKey, setSecretKey] = useState("");

  // Filter domains that don't have WordPress configured yet
  const availableDomains = domains.filter(d => !d.wordpress_secret_key);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDomainId || !secretKey.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from('domains')
        .update({ wordpress_secret_key: secretKey.trim() })
        .eq('id', selectedDomainId);

      if (error) throw error;

      toast.success("WordPress site added successfully");
      setOpen(false);
      setSelectedDomainId("");
      setSecretKey("");
      onSuccess();
    } catch (error: any) {
      console.error('Error adding WordPress site:', error);
      toast.error("Failed to add WordPress site");
    }
  };

  if (availableDomains.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add WordPress Site
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add WordPress Site</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Select Domain</Label>
            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
              <SelectTrigger id="domain">
                <SelectValue placeholder="Choose a domain" />
              </SelectTrigger>
              <SelectContent>
                {availableDomains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.domain_url}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secretKey">WordPress Secret Key</Label>
            <Input
              id="secretKey"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter secret key from WordPress plugin"
              required
            />
            <p className="text-xs text-muted-foreground">
              Get this key from your WordPress update management plugin
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Site</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}