"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get the count of projects for the current user
 * Server action for use in client components
 */
export async function getProjectCount(): Promise<number> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return 0;
    }
    
    const { count, error } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    
    if (error) {
      console.error("Error fetching project count:", error);
      return 0;
    }
    
    return count ?? 0;
  } catch (error) {
    console.error("Server action error:", error);
    return 0;
  }
}

/**
 * Get recent projects for the current user (limited to 5)
 * Server action for use in client components
 */
export async function getRecentProjects(limit: number = 5) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }
    
    const { data, error } = await supabase
      .from("projects")
      .select(`
        id,
        name,
        original_image_url,
        created_at,
        variants (id)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error("Error fetching recent projects:", error);
      return [];
    }
    
    return data ?? [];
  } catch (error) {
    console.error("Server action error:", error);
    return [];
  }
}

/**
 * Get all projects for the current user with variants
 * Server action for use in client components
 */
export async function getAllProjects(sortBy: "newest" | "oldest" | "name" = "newest") {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }
    
    const orderField = sortBy === "name" ? "name" : "created_at";
    const ascending = sortBy === "oldest" || sortBy === "name";
    
    const { data, error } = await supabase
      .from("projects")
      .select(`
        id,
        name,
        original_image_url,
        created_at,
        variants (
          id,
          variant_number,
          image_url,
          recommended_background
        )
      `)
      .eq("user_id", user.id)
      .order(orderField, { ascending });
    
    if (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
    
    return data ?? [];
  } catch (error) {
    console.error("Server action error:", error);
    return [];
  }
}

