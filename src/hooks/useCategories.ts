import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCategories() {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("name")
      .order("name");

    if (!error && data) {
      setCategories(data.map((c) => c.name));
    }
    setLoading(false);
  };

  const addCategory = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    await supabase
      .from("categories")
      .insert({ name: trimmed })
      .onConflict("name")
      .ignore();

    fetchCategories();
  };

  return { categories, addCategory, loading };
}
