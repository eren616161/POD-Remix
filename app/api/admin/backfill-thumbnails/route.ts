import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createThumbnailFromBuffer } from "@/lib/thumbnail";

// Configure for long-running operation
export const maxDuration = 300; // 5 minutes max

const STORAGE_BUCKET = "design-images";

// Create a Supabase client with service role for storage operations
const supabaseStorage = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/admin/backfill-thumbnails
 * Generates thumbnails for all existing variants that don't have one
 * 
 * This is a one-time migration script - run it once after deploying thumbnail support
 */
export async function POST() {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🚀 Starting thumbnail backfill...");

    // Fetch all variants without thumbnails for this user's projects
    const { data: variants, error: fetchError } = await supabase
      .from("variants")
      .select(`
        id,
        image_url,
        thumbnail_url,
        project_id,
        projects!inner (
          user_id
        )
      `)
      .eq("projects.user_id", user.id)
      .is("thumbnail_url", null);

    if (fetchError) {
      console.error("Failed to fetch variants:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch variants", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!variants || variants.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No variants need thumbnails",
        processed: 0,
      });
    }

    console.log(`📊 Found ${variants.length} variants without thumbnails`);

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process variants in batches to avoid overwhelming the server
    for (const variant of variants) {
      try {
        console.log(`Processing variant ${variant.id}...`);

        // Download the full image
        const response = await fetch(variant.image_url);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create thumbnail
        const thumbnailBuffer = await createThumbnailFromBuffer(buffer, 400);

        // Generate thumbnail path based on original image path
        // Original: .../variant_1.png → Thumbnail: .../variant_1_thumb.webp
        const originalPath = new URL(variant.image_url).pathname;
        const thumbnailPath = originalPath
          .replace("/storage/v1/object/public/design-images/", "")
          .replace(".png", "_thumb.webp");

        // Upload thumbnail
        const { error: uploadError } = await supabaseStorage.storage
          .from(STORAGE_BUCKET)
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: "image/webp",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabaseStorage.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(thumbnailPath);

        // Update database
        const { error: updateError } = await supabase
          .from("variants")
          .update({ thumbnail_url: urlData.publicUrl })
          .eq("id", variant.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        processed++;
        console.log(`✅ Variant ${variant.id} - thumbnail created (${processed}/${variants.length})`);

      } catch (err) {
        failed++;
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Variant ${variant.id}: ${errorMsg}`);
        console.error(`❌ Variant ${variant.id} failed:`, errorMsg);
      }
    }

    console.log(`\n🏁 Backfill complete: ${processed} success, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Backfill complete`,
      processed,
      failed,
      total: variants.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error("Backfill error:", error);
    return NextResponse.json(
      {
        error: "Backfill failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/backfill-thumbnails
 * Check status - how many variants need thumbnails
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Count variants without thumbnails
    const { count: needsThumbnails } = await supabase
      .from("variants")
      .select("id, projects!inner(user_id)", { count: "exact", head: true })
      .eq("projects.user_id", user.id)
      .is("thumbnail_url", null);

    // Count total variants
    const { count: totalVariants } = await supabase
      .from("variants")
      .select("id, projects!inner(user_id)", { count: "exact", head: true })
      .eq("projects.user_id", user.id);

    return NextResponse.json({
      needsThumbnails: needsThumbnails || 0,
      totalVariants: totalVariants || 0,
      hasThumbnails: (totalVariants || 0) - (needsThumbnails || 0),
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}

