import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  analyzeImage,
  generateRemixStrategies,
  generateVariantImages,
} from "@/lib/gemini";
import { removeBackgroundWithRecraft } from "@/lib/recraft";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Configure API route for long-running generation
export const maxDuration = 300; // 5 minutes max

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Create a Supabase client for storage operations (using service role)
const supabaseStorage = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STORAGE_BUCKET = "design-images";

/**
 * Convert base64 data URL to Buffer for upload
 */
function dataURLtoBuffer(dataURL: string): { buffer: Buffer; mimeType: string } {
  const matches = dataURL.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid data URL format");
  }
  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");
  return { buffer, mimeType };
}

/**
 * Upload an image to Supabase Storage and return the public URL
 */
async function uploadToStorage(imageData: string, path: string): Promise<string> {
  const { buffer, mimeType } = dataURLtoBuffer(imageData);

  const { error } = await supabaseStorage.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: urlData } = supabaseStorage.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * POST /api/projects/[id]/regenerate
 * Regenerates variants for an existing project, creating a new batch
 */
export async function POST(request: Request, { params }: RouteParams) {
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

    // Fetch the project to get original image and verify ownership
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*, variants(*)')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Type assertion for the project data
    const project = projectData as {
      id: string;
      user_id: string;
      name: string;
      original_image_url: string;
      created_at: string;
      variants: Array<{ batch_number?: number }>;
    };

    // Calculate the next batch number
    const existingBatches = project.variants?.map((v) => v.batch_number || 1) || [1];
    const maxBatch = Math.max(...existingBatches);
    const nextBatchNumber = maxBatch + 1;

    console.log(`🔄 Regenerating project ${projectId}, creating batch ${nextBatchNumber}`);

    // Fetch the original image
    const originalImageUrl = project.original_image_url;
    
    // Download the original image and convert to base64
    const imageResponse = await fetch(originalImageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch original image");
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const imageDataUrl = `data:image/png;base64,${base64Image}`;

    console.log("📷 Original image fetched, starting pre-processing...");

    // Pre-process: Remove background from original image
    let cleanedReferenceImage: string;
    try {
      console.log("🧹 Pre-processing: Extracting design from mockup...");
      cleanedReferenceImage = await removeBackgroundWithRecraft(imageDataUrl);
      console.log("✅ Design extracted successfully");
    } catch (error) {
      console.error("Pre-processing error:", error);
      cleanedReferenceImage = imageDataUrl;
    }

    // Analyze the design
    console.log("🔍 Analyzing design...");
    const analysis = await analyzeImage(imageDataUrl);
    console.log("✅ Analysis complete:", analysis);

    // Generate remix strategies
    console.log("💡 Generating remix strategies...");
    const strategies = await generateRemixStrategies(analysis);
    console.log(`✅ Generated ${strategies.length} strategies`);

    // Generate variant images
    console.log("🎨 Generating variant images...");
    const variants = await generateVariantImages(cleanedReferenceImage, strategies, analysis);
    console.log(`✅ Generated ${variants.length} variants`);

    // Upload variants to storage with batch-specific paths
    console.log("📤 Uploading variants to storage...");
    const uploadedVariants = await Promise.all(
      variants.map(async (variant) => {
        const variantPath = `variants/${user.id}/${projectId}_b${nextBatchNumber}_v${variant.id}.png`;
        
        try {
          const imageUrl = await uploadToStorage(variant.design.imageData, variantPath);
          console.log(`✅ Variant ${variant.id} uploaded`);
          
          return {
            ...variant,
            design: {
              ...variant.design,
              imageData: imageUrl,
              imageUrl: imageUrl,
            },
          };
        } catch (uploadError) {
          console.error(`❌ Failed to upload variant ${variant.id}:`, uploadError);
          return variant;
        }
      })
    );

    // Save variant records to database
    console.log("💾 Saving variants to database...");
    const variantRecords = uploadedVariants.map((variant) => {
      // Access design with type assertion since we added imageUrl during upload
      const design = variant.design as { imageData: string; imageUrl?: string; prompt: string };
      return {
        project_id: projectId,
        variant_number: variant.id,
        batch_number: nextBatchNumber,
        strategy: variant.strategy,
        image_url: design.imageUrl || design.imageData,
        recommended_background: variant.colorClassification?.recommendedBackground || 'light' as const,
        product_hint: variant.colorClassification?.productHint || null,
      };
    });

    const { error: insertError } = await supabase
      .from('variants')
      .insert(variantRecords as never);

    if (insertError) {
      console.error("Failed to save variants:", insertError);
      console.error("Insert error details:", JSON.stringify(insertError, null, 2));
      
      // Check if it's a missing column error
      if (insertError.message?.includes('batch_number')) {
        return NextResponse.json(
          { 
            error: "Database migration required. Please run the SQL migration to add batch_number column.",
            details: insertError.message 
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to save regenerated variants", details: insertError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Regeneration complete! Created batch ${nextBatchNumber} with ${variants.length} variants`);

    return NextResponse.json({
      success: true,
      batchNumber: nextBatchNumber,
      variantCount: variants.length,
    });

  } catch (error) {
    console.error("Regeneration error:", error);
    return NextResponse.json(
      { 
        error: "Failed to regenerate variants",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

