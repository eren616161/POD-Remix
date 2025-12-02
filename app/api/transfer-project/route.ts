import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface PendingVariant {
  id: number;
  strategy: string;
  design: {
    imageData: string;
    imageUrl?: string;
  };
  colorClassification?: {
    recommendedBackground: 'light' | 'dark';
  };
}

interface TransferRequest {
  originalImage: string;
  variants: PendingVariant[];
  projectName?: string;
}

export async function POST(request: Request) {
  try {
    // Create untyped Supabase client to avoid type inference issues
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore
            }
          },
        },
      }
    );
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: TransferRequest = await request.json();
    const { originalImage, variants, projectName } = body;

    if (!originalImage || !variants || variants.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use the original image URL/data directly
    const originalImageUrl = originalImage;

    // Generate project name if not provided
    const finalProjectName = projectName || `Design ${new Date().toLocaleDateString()}`;

    // Create project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: finalProjectName,
        original_image_url: originalImageUrl,
      })
      .select()
      .single();

    if (projectError || !project) {
      console.error("Failed to create project:", projectError);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    // Save each variant
    const variantInserts = variants.map((v) => {
      const imageUrl = v.design.imageUrl || v.design.imageData;
      
      return {
        project_id: project.id,
        user_id: user.id,
        variant_number: v.id,
        batch_number: 1,
        strategy: v.strategy,
        image_url: imageUrl,
        recommended_background: v.colorClassification?.recommendedBackground || 'light',
      };
    });

    const { error: variantsError } = await supabase
      .from("variants")
      .insert(variantInserts);

    if (variantsError) {
      console.error("Failed to save variants:", variantsError);
      // Still return success since project was created
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
    });
  } catch (error) {
    console.error("Transfer project error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
