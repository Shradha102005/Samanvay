import { supabase } from "@/integrations/supabase/client";

export interface AISuggestion {
  domain: string;
  sub_domain: string;
  priority: string;
  tags: string[];
  summary: string;
  routing_suggestion: string;
}

/**
 * Calls the ai-categorize Supabase Edge Function.
 * Returns AI-suggested domain, priority, tags, and routing.
 * Falls back to rule-based if no Gemini key is configured server-side.
 */
export async function categorizeProblem(
  title: string,
  description: string,
  location_district?: string
): Promise<AISuggestion> {
  const { data, error } = await supabase.functions.invoke("ai-categorize", {
    body: { title, description, location_district },
  });

  if (error) throw new Error(error.message || "AI categorization failed");
  if (data?.error) throw new Error(data.error);
  return data as AISuggestion;
}
