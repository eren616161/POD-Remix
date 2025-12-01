import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sort") || "created_at";
    const sortOrder = searchParams.get("order") === "asc" ? true : false;

    // Fetch user's projects with variants
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        variants (id, variant_number)
      `)
      .eq('user_id', user.id)
      .order(sortBy, { ascending: sortOrder })
      .limit(limit);

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      projects: projects || [],
      total: projects?.length || 0
    });
  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

