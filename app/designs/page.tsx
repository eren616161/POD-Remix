import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DesignsContent from "@/components/DesignsContent";

// Server Component - data is fetched on the server
export default async function DesignsPage() {
  const supabase = await createClient();
  
  // Get current user (server-side)
  const { data: { user } } = await supabase.auth.getUser();
  
  // Redirect to home if not logged in
  if (!user) {
    redirect("/?signin=true");
  }
  
  // Fetch projects on the server
  const { data: projects, error } = await supabase
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
        recommended_background,
        strategy
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error fetching projects:", error.message, error.code, error.details);
  }
  
  const projectsList = projects || [];

  return (
    <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-primary">My Design Projects</h1>
          <p className="text-muted mt-1 flex items-center gap-2">
            <span className="inline-flex px-2 py-0.5 bg-accent/10 text-accent rounded text-sm font-medium">
              {projectsList.length} project{projectsList.length !== 1 ? 's' : ''}
            </span>
            <span>in your library</span>
          </p>
        </div>

        {/* Client Component handles sorting/view toggle */}
        <DesignsContent initialProjects={projectsList} />
      </div>
    </main>
  );
}
