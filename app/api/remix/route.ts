import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  analyzeImage,
  generateRemixStrategies,
  generateVariantImages,
  type DesignAnalysis,
  type GeneratedVariant,
} from "@/lib/gemini";
import { removeBackgroundWithRecraft } from "@/lib/recraft";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Configure API route
export const maxDuration = 300; // 5 minutes max (important for Vercel deployments)

// Rate limiting constants
const DAILY_LIMIT = 2;
const RATE_LIMIT_SALT = process.env.RATE_LIMIT_SALT || 'podremix-salt-2024';

// Create a Supabase client for server-side storage operations
// Using service role key for unrestricted storage access in API routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Hash IP address for privacy-preserving rate limiting
 */
function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip + RATE_LIMIT_SALT).digest('hex');
}

/**
 * Get the current user from session (if authenticated)
 */
async function getCurrentUser() {
  const cookieStore = await cookies();
  
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Not needed for reading
        },
      },
    }
  );
  
  const { data: { user } } = await supabaseAuth.auth.getUser();
  return user;
}

/**
 * Check and update rate limit for anonymous users
 * Returns: { allowed: boolean, remaining: number, count: number }
 */
async function checkRateLimit(ipHash: string): Promise<{ allowed: boolean; remaining: number; count: number }> {
  const today = new Date().toISOString().split('T')[0];
  
  // Check current usage
  const { data: usage } = await supabase
    .from('anonymous_usage')
    .select('count')
    .eq('ip_hash', ipHash)
    .eq('date', today)
    .single();
  
  const currentCount = usage?.count || 0;
  
  if (currentCount >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0, count: currentCount };
  }
  
  return { 
    allowed: true, 
    remaining: DAILY_LIMIT - currentCount,
    count: currentCount 
  };
}

/**
 * Increment usage count for an IP hash
 */
async function incrementUsage(ipHash: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  
  // First, try to get existing record
  const { data: existing } = await supabase
    .from('anonymous_usage')
    .select('count')
    .eq('ip_hash', ipHash)
    .eq('date', today)
    .single();
  
  if (existing) {
    // Update existing record
    const newCount = existing.count + 1;
    await supabase
      .from('anonymous_usage')
      .update({ count: newCount })
      .eq('ip_hash', ipHash)
      .eq('date', today);
    return newCount;
  } else {
    // Insert new record
    const { error } = await supabase
      .from('anonymous_usage')
      .insert({ ip_hash: ipHash, date: today, count: 1 });
    
    if (error) {
      // Race condition: another request created the record
      // Try to update instead
      const { data: current } = await supabase
        .from('anonymous_usage')
        .select('count')
        .eq('ip_hash', ipHash)
        .eq('date', today)
        .single();
      
      if (current) {
        const newCount = current.count + 1;
        await supabase
          .from('anonymous_usage')
          .update({ count: newCount })
          .eq('ip_hash', ipHash)
          .eq('date', today);
        return newCount;
      }
    }
    return 1;
  }
}

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
async function uploadToStorage(
  imageData: string,
  path: string
): Promise<string> {
  const { buffer, mimeType } = dataURLtoBuffer(imageData);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * POST /api/remix
 * Handles the complete POD remix flow:
 * 1. Check rate limit (for anonymous users)
 * 2. Parse uploaded image
 * 3. Analyze design using Gemini (including design_type classification)
 * 4. Generate remix strategies
 * 5. Generate variant images
 */
export async function POST(request: NextRequest) {
  try {
    // Step 0: Check if user is authenticated (skip rate limit for authenticated users)
    const user = await getCurrentUser();
    let ipHash: string | null = null;
    let rateLimitInfo: { remaining: number; count: number } | null = null;
    
    if (!user) {
      // Anonymous user - apply rate limiting
      const forwardedFor = request.headers.get('x-forwarded-for');
      const ip = forwardedFor?.split(',')[0]?.trim() || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      ipHash = hashIP(ip);
      
      const rateCheck = await checkRateLimit(ipHash);
      
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { 
            error: 'daily_limit', 
            message: 'You\'ve used your 2 free designs for today. Sign up to get unlimited access!',
            remaining: 0 
          }, 
          { status: 429 }
        );
      }
      
      rateLimitInfo = { remaining: rateCheck.remaining, count: rateCheck.count };
    }
    
    // Step 1: Parse the uploaded image from FormData
    const formData = await request.formData();
    const file = formData.get("image") as File;

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Convert file to base64 for Gemini API
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const imageDataUrl = `data:${file.type};base64,${base64Image}`;

    console.log("Image uploaded successfully, starting pre-processing...");

    // Step 1.5: PRE-PROCESS - Extract design from mockup by removing background
    // This strips away any t-shirt/product mockup, leaving just the isolated design
    let cleanedReferenceImage: string;
    try {
      console.log("🧹 Pre-processing: Extracting design from mockup...");
      cleanedReferenceImage = await removeBackgroundWithRecraft(imageDataUrl);
      console.log("✅ Design extracted successfully - mockup removed");
    } catch (error) {
      console.error("Pre-processing error:", error);
      // If background removal fails, fall back to original image
      console.log("⚠️ Falling back to original image as reference");
      cleanedReferenceImage = imageDataUrl;
    }

    // Step 2: Analyze the design (use ORIGINAL image for better context)
    let analysis: DesignAnalysis;
    try {
      analysis = await analyzeImage(imageDataUrl);
      console.log("Design analysis complete:", analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      return NextResponse.json(
        {
          error: "Failed to analyze design",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Step 3: Generate remix strategies
    let strategies;
    try {
      strategies = await generateRemixStrategies(analysis);
      console.log("Remix strategies generated:", strategies.length);
    } catch (error) {
      console.error("Strategy generation error:", error);
      return NextResponse.json(
        {
          error: "Failed to generate remix strategies",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Step 4: Generate variant images (in parallel for speed)
    // Use the CLEANED reference image (mockup removed) so Gemini doesn't see t-shirts
    // Note: Trimming now happens INSIDE generateVariantImages, before POD normalization
    // Pass full analysis for per-variant color classification
    let variants: GeneratedVariant[];
    try {
      console.log("Starting parallel variant generation with cleaned reference...");
      variants = await generateVariantImages(cleanedReferenceImage, strategies, analysis);
      console.log("All variants generated successfully");
    } catch (error) {
      console.error("Variant generation error:", error);
      return NextResponse.json(
        {
          error: "Failed to generate variant images",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Step 5: Upload images to Supabase Storage and convert to URLs
    // This prevents huge base64 strings from being held in React state
    console.log("Uploading variant images to Supabase Storage...");
    
    // Generate a unique session ID for this remix batch
    const sessionId = crypto.randomUUID();
    
    // Upload all variants in parallel
    const uploadedVariants = await Promise.all(
      variants.map(async (variant) => {
        const variantPath = `temp/${sessionId}/variant_${variant.id}.png`;
        
        try {
          const imageUrl = await uploadToStorage(variant.design.imageData, variantPath);
          console.log(`✅ Variant ${variant.id} uploaded: ${imageUrl.substring(0, 60)}...`);
          
          return {
            ...variant,
            design: {
              ...variant.design,
              imageData: imageUrl, // Replace base64 with URL
              imageUrl: imageUrl,  // Also provide explicit imageUrl field
            },
          };
        } catch (uploadError) {
          console.error(`❌ Failed to upload variant ${variant.id}:`, uploadError);
          // Fall back to returning base64 if upload fails
          return variant;
        }
      })
    );

    console.log(`✅ All ${uploadedVariants.length} variants uploaded to storage`);
    
    // Step 6: Increment usage count for anonymous users AFTER successful generation
    let newRemaining = null;
    if (ipHash && rateLimitInfo !== null) {
      try {
        const newCount = await incrementUsage(ipHash);
        newRemaining = Math.max(0, DAILY_LIMIT - newCount);
        console.log(`📊 Anonymous usage updated: ${newCount}/${DAILY_LIMIT}, remaining: ${newRemaining}`);
      } catch (usageError) {
        console.error('Failed to increment usage:', usageError);
        // Don't fail the request if usage tracking fails
      }
    }
    
    return NextResponse.json(
      {
        success: true,
        analysis,
        variants: uploadedVariants,
        sessionId, // Return session ID for potential cleanup later
        remaining: newRemaining, // null for authenticated users, number for anonymous
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in remix API:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/remix
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "POD Remix API is running",
    endpoints: {
      POST: "Upload image to generate remixes",
    },
  });
}

