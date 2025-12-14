import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch project with variants
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        variants (*)
      `)
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Gather product counts per variant from published_products
    let productCounts: Record<string, number> = {};
    const variantIds = (project.variants || []).map((variant: { id: string }) => variant.id).filter(Boolean);

    if (variantIds.length > 0) {
      const { data: publishedProducts } = await supabase
        .from('published_products')
        .select('variant_id')
        .eq('user_id', user.id)
        .in('variant_id', variantIds);

      if (publishedProducts) {
        productCounts = publishedProducts.reduce((acc: Record<string, number>, item) => {
          const variantId = item.variant_id as string;
          acc[variantId] = (acc[variantId] || 0) + 1;
          return acc;
        }, {});
      }
    }

    return NextResponse.json({ project, productCounts });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify project belongs to user
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const bucket = 'design-images';

    // Delete images from storage
    const originalPath = `originals/${user.id}/${projectId}.png`;
    const variantPaths = [1, 2, 3, 4].map(n => `variants/${user.id}/${projectId}_v${n}.png`);
    
    // Delete all images (ignore errors for missing files)
    await supabase.storage.from(bucket).remove([originalPath, ...variantPaths]);

    // Delete project record (variants will cascade delete due to foreign key)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: "Failed to delete project" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

