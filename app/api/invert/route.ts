import { NextRequest, NextResponse } from "next/server";
import { luminosityInvert } from "@/lib/image-utils";

/**
 * POST /api/invert
 * Performs luminosity inversion on an image
 * 
 * This transforms dark elements to light (and vice versa) while preserving
 * color relationships. Useful for adapting designs between light and dark products.
 * 
 * Request body:
 * - imageData: Base64 encoded image with data URI prefix
 * 
 * Response:
 * - invertedImage: Base64 encoded PNG with inverted luminosity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData } = body;

    // Validate input
    if (!imageData) {
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400 }
      );
    }

    // Validate it's a base64 image
    if (!imageData.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Invalid image format. Expected base64 data URI." },
        { status: 400 }
      );
    }

    console.log("🔄 Starting luminosity invert...");

    // Perform luminosity inversion
    const invertedImage = await luminosityInvert(imageData);

    console.log("✅ Luminosity invert complete");

    return NextResponse.json(
      {
        success: true,
        invertedImage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in invert API:", error);
    return NextResponse.json(
      {
        error: "Failed to invert image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invert
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Luminosity Invert API is running",
    description: "Inverts lightness while preserving hue - useful for adapting designs between light and dark products",
  });
}

