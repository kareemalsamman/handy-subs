import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_CATEGORIES = ["Ajad", "Soft", "Spex", "Almas", "Others"];

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("categories")
        .single();

      if (error) throw error;

      if (data?.categories && Array.isArray(data.categories)) {
        setCategories(data.categories as string[]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Fall back to defaults
    } finally {
      setIsLoading(false);
    }
  };

  const saveCategories = async (newCategories: string[]) => {
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .single();

    if (existing) {
      const { error } = await supabase
        .from("settings")
        .update({ categories: newCategories } as any)
        .eq("id", existing.id);
      if (error) throw error;
    }

    setCategories(newCategories);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return { categories, isLoading, saveCategories, refetch: fetchCategories };
}
