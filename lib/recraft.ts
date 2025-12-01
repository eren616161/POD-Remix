import OpenAI from "openai";

// Check if API key is set
if (!process.env.RECRAFT_API_KEY) {
  console.warn("⚠️ RECRAFT_API_KEY is not set in environment variables");
}

// Initialize Recraft client using OpenAI-compatible API
const recraftClient = new OpenAI({
  baseURL: 'https://external.api.recraft.ai/v1',
  apiKey: process.env.RECRAFT_API_KEY || "",
});

export interface RemixStrategy {
  id: number;
  strategy: string;
  prompt: string;
}

export interface DesignVersion {
  imageData: string;
  prompt: string;
}

/**
 * Helper function to get byte length of a string (UTF-8 encoding)
 * Recraft API limits prompts to 1000 BYTES, not characters
 */
function getByteLength(str: string): number {
  return Buffer.byteLength(str, 'utf8');
}

/**
 * Helper function to truncate string to fit within byte limit
 */
function truncateToByteLimit(str: string, maxBytes: number): string {
  if (getByteLength(str) <= maxBytes) {
    return str;
  }
  
  // Binary search to find the right length
  let low = 0;
  let high = str.length;
  
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (getByteLength(str.substring(0, mid)) <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  
  return str.substring(0, low);
}

/**
 * Generate a single design variant using Recraft AI via direct HTTP call
 * This bypasses the OpenAI wrapper and calls Recraft's API directly
 */
async function generateRecraftDesignDirect(
  strategy: RemixStrategy
): Promise<DesignVersion> {
  try {
    console.log(`🎨 Generating variant ${strategy.id} with Recraft (direct): ${strategy.strategy}`);
    console.log(`📋 Strategy prompt: ${strategy.prompt}`);

    // Recraft API has a 1000 BYTE limit (not characters!)
    const MAX_BYTES = 1000;
    
    // Very concise template to maximize space for the actual design prompt
    const template = "Isolated flat 2D clipart design with bold outlines, NO background patterns or textures, completely transparent background: ";
    const templateBytes = getByteLength(template);
    
    // Calculate max bytes for strategy prompt (leave some buffer)
    const maxPromptBytes = MAX_BYTES - templateBytes - 10; // 10 byte safety buffer
    
    // Truncate strategy prompt if needed
    const truncatedPrompt = truncateToByteLimit(strategy.prompt, maxPromptBytes);
    
    // Build final prompt
    const fullPrompt = template + truncatedPrompt;
    
    const finalByteLength = getByteLength(fullPrompt);
    console.log(`📝 Prompt: ${finalByteLength} bytes (max: ${MAX_BYTES} bytes)`);
    
    if (finalByteLength > MAX_BYTES) {
      throw new Error(`Prompt exceeds ${MAX_BYTES} bytes: ${finalByteLength} bytes`);
    }

    // Make direct HTTP call to Recraft API
    // Following the official documentation from Recraft
    const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        style: 'vector_illustration',
        model: 'recraftv3',
        size: '1024x1024',
        response_format: 'b64_json',
        n: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Recraft API error (${response.status}):`, errorText);
      throw new Error(`Recraft API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Extract the base64 image data
    const imageData = data.data?.[0]?.b64_json;
    if (!imageData) {
      console.error(`❌ No image data in response for variant ${strategy.id}`);
      console.error('Response structure:', JSON.stringify(data).substring(0, 200));
      throw new Error(`No image data returned from Recraft for variant ${strategy.id}`);
    }

    // Validate base64 data
    if (typeof imageData !== 'string' || imageData.length < 100) {
      console.error(`❌ Invalid image data for variant ${strategy.id}: length=${imageData?.length}`);
      throw new Error(`Invalid image data returned from Recraft for variant ${strategy.id}`);
    }

    console.log(`✅ Recraft generated variant ${strategy.id} successfully (${Math.round(imageData.length / 1024)}KB)`);

    const base64Prefix = imageData.substring(0, 8);
    const mimeType = base64Prefix.startsWith("PHN2") || base64Prefix.startsWith("PD94")
      ? "image/svg+xml"
      : "image/png";
    console.log(`🖼️ Recraft base64 prefix: ${base64Prefix} -> mime ${mimeType}`);

    return {
      imageData: `data:${mimeType};base64,${imageData}`,
      prompt: strategy.prompt,
    };
  } catch (error: any) {
    console.error(`Error generating Recraft design for variant ${strategy.id}:`, error);
    throw new Error(
      `Failed to generate design with Recraft (variant ${strategy.id}): ${error.message || "Unknown error"}`
    );
  }
}

/**
 * Generate a single design variant using Recraft AI
 * Recraft is specifically designed for flat graphics, logos, and illustrations
 * It handles transparency properly without checkerboard patterns
 */
async function generateRecraftDesign(
  strategy: RemixStrategy
): Promise<DesignVersion> {
  try {
    console.log(`🎨 Generating variant ${strategy.id} with Recraft: ${strategy.strategy}`);
    console.log(`📋 Strategy prompt: ${strategy.prompt}`);

    // Recraft API has a 1000 BYTE limit (not characters!)
    const MAX_BYTES = 1000;
    
    // Very concise template to maximize space for the actual design prompt
    const template = "Isolated flat 2D clipart design with bold outlines, NO background patterns or textures, completely transparent background: ";
    const templateBytes = getByteLength(template);
    
    // Calculate max bytes for strategy prompt (leave some buffer)
    const maxPromptBytes = MAX_BYTES - templateBytes - 10; // 10 byte safety buffer
    
    // Truncate strategy prompt if needed
    const truncatedPrompt = truncateToByteLimit(strategy.prompt, maxPromptBytes);
    
    // Build final prompt
    const fullPrompt = template + truncatedPrompt;
    
    const finalByteLength = getByteLength(fullPrompt);
    console.log(`📝 Prompt: ${finalByteLength} bytes (max: ${MAX_BYTES} bytes)`);
    
    if (finalByteLength > MAX_BYTES) {
      throw new Error(`Prompt exceeds ${MAX_BYTES} bytes: ${finalByteLength} bytes`);
    }

    // Generate image with Recraft using OpenAI library
    // Following the official Recraft documentation pattern
    const response = await recraftClient.images.generate({
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
      extra_body: {
        style: 'vector_illustration',
        model: 'recraftv3',
      }
    } as any);

    console.log(`✅ Recraft generated variant ${strategy.id} successfully`);

    // Extract the base64 image data, guarding against response.data being undefined
    const imageData = response.data?.[0]?.b64_json;
    if (!imageData) {
      throw new Error(`No image data returned from Recraft for variant ${strategy.id}`);
    }


    const base64Prefix = imageData.substring(0, 8);
    const mimeType = base64Prefix.startsWith("PHN2") || base64Prefix.startsWith("PD94")
      ? "image/svg+xml"
      : "image/png";
    console.log(`🖼️ Recraft base64 prefix (OpenAI client): ${base64Prefix} -> mime ${mimeType}`);

    return {
      imageData: `data:${mimeType};base64,${imageData}`,
      prompt: strategy.prompt,
    };
  } catch (error: any) {
    console.error(`Error generating Recraft design for variant ${strategy.id}:`, error);
    
    // Try to extract more detailed error information
    let errorMessage = "Unknown error";
    if (error?.response) {
      console.error("Error response:", error.response);
      errorMessage = JSON.stringify(error.response);
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    // If it's an API error, try to get the response body
    if (error?.error) {
      console.error("API error details:", error.error);
      errorMessage = JSON.stringify(error.error);
    }
    
    throw new Error(
      `Failed to generate design with Recraft (variant ${strategy.id}): ${errorMessage}`
    );
  }
}

/**
 * Generate all 4 variant images in parallel using Recraft
 */
export async function generateVariantImagesWithRecraft(
  strategies: RemixStrategy[]
): Promise<Array<{ id: number; strategy: string; design: DesignVersion }>> {
  try {
    console.log("🚀 Starting parallel Recraft variant generation...");

    // Generate all variants in parallel using direct API calls
    const generationPromises = strategies.map(async (strategy) => {
      const design = await generateRecraftDesignDirect(strategy);
      return {
        id: strategy.id,
        strategy: strategy.strategy,
        design,
      };
    });

    const variants = await Promise.all(generationPromises);
    console.log(`✅ All Recraft variants generated successfully (${variants.length} variants)`);
    
    // Log summary of what we're returning
    variants.forEach(v => {
      const dataLength = v.design.imageData.length;
      console.log(`  - Variant ${v.id}: ${v.strategy} (${Math.round(dataLength / 1024)}KB)`);
    });
    
    return variants;
  } catch (error) {
    console.error("Error generating variant images with Recraft:", error);
    throw new Error(
      `Failed to generate variants with Recraft: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Remove background from an image using Recraft AI's background removal service
 * This is used after Gemini generates images (which often have backgrounds)
 * 
 * Uses multipart/form-data as per Recraft API documentation:
 * curl -X POST https://external.api.recraft.ai/v1/images/removeBackground \
 *   -H "Authorization: Bearer $RECRAFT_API_TOKEN" \
 *   -F "response_format=b64_json" \
 *   -F "file=@image.png"
 * 
 * @param imageData - Base64 encoded image with data URI prefix (e.g., "data:image/png;base64,...")
 * @returns Base64 encoded PNG with transparent background
 */
export async function removeBackgroundWithRecraft(imageData: string): Promise<string> {
  try {
    console.log('🧹 Removing background with Recraft AI...');
    
    // Remove data URI prefix if present to get raw base64
    const base64Data = imageData.includes(',') 
      ? imageData.split(',')[1] 
      : imageData;
    
    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Create a Blob from the buffer for FormData
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    
    // Create FormData for multipart/form-data (as required by Recraft API)
    const formData = new FormData();
    formData.append('response_format', 'b64_json');  // Request base64 JSON response
    formData.append('file', blob, 'image.png');      // Attach the image file
    
    // Call Recraft's background removal API
    const response = await fetch('https://external.api.recraft.ai/v1/images/removeBackground', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
        // DON'T set Content-Type - FormData handles it automatically with boundary
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Recraft background removal error (${response.status}):`, errorText);
      throw new Error(`Recraft background removal failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📦 Recraft response structure:', Object.keys(data));
    
    // Debug: Log the image object to understand its structure
    console.log('🔍 Image object type:', typeof data.image);
    if (data.image && typeof data.image === 'object') {
      console.log('🔍 Image object keys:', Object.keys(data.image));
      console.log('🔍 Image object sample:', JSON.stringify(data.image).substring(0, 200));
    }
    
    // Extract the cleaned image from response
    // Try multiple possible response structures based on Recraft docs
    let cleanedImageBase64: string | undefined;
    
    if (typeof data.image === 'string') {
      // Direct string
      cleanedImageBase64 = data.image;
    } else if (data.image && typeof data.image === 'object') {
      // Try various object structures
      cleanedImageBase64 = 
        data.image.url ||           // Python example: response['image']['url']
        data.image.data ||          // Possible: image.data
        data.image.b64_json ||      // Possible: image.b64_json
        data.image.base64;          // Possible: image.base64
    } else if (data.data?.[0]?.b64_json) {
      // Array format
      cleanedImageBase64 = data.data[0].b64_json;
    } else if (data.b64_json) {
      // Direct b64_json field
      cleanedImageBase64 = data.b64_json;
    }
    
    if (!cleanedImageBase64) {
      console.error('❌ No image data in Recraft response. Full response:', JSON.stringify(data).substring(0, 1000));
      throw new Error('No image data returned from Recraft background removal');
    }
    
    // Validate the cleaned image data
    if (typeof cleanedImageBase64 !== 'string' || cleanedImageBase64.length < 100) {
      throw new Error(`Invalid image data from Recraft: length=${cleanedImageBase64?.length}`);
    }
    
    console.log(`✅ Background removed successfully (${Math.round(cleanedImageBase64.length / 1024)}KB)`);
    
    // Detect the actual image format from magic bytes (first few characters of base64)
    let mimeType = 'image/png'; // default
    const magicBytes = cleanedImageBase64.substring(0, 8);
    
    if (magicBytes.startsWith('UklGR')) {
      // UklGR = "RIFF" in base64 = WEBP format
      mimeType = 'image/webp';
      console.log('🖼️ Detected WEBP format');
    } else if (magicBytes.startsWith('iVBOR')) {
      // iVBOR = PNG signature in base64
      mimeType = 'image/png';
      console.log('🖼️ Detected PNG format');
    } else if (magicBytes.startsWith('/9j/')) {
      // /9j/ = JPEG signature in base64
      mimeType = 'image/jpeg';
      console.log('🖼️ Detected JPEG format');
    } else {
      console.log('⚠️ Unknown image format, using PNG as default. Magic bytes:', magicBytes);
    }
    
    // Return with proper data URI prefix (if not already included)
    if (cleanedImageBase64.startsWith('data:')) {
      return cleanedImageBase64;
    }
    return `data:${mimeType};base64,${cleanedImageBase64}`;
    
  } catch (error) {
    console.error('❌ Error removing background with Recraft:', error);
    throw new Error(
      `Failed to remove background: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Upscale an image using Recraft AI's Crisp Upscale service
 * This increases resolution and sharpness WITHOUT altering the original content
 * Perfect for POD designs where consistency is critical
 * 
 * Cost: 4 API units = $0.004 per image
 * 
 * Uses multipart/form-data as per Recraft API documentation:
 * curl -X POST https://external.api.recraft.ai/v1/images/crispUpscale \
 *   -H "Authorization: Bearer $RECRAFT_API_TOKEN" \
 *   -F "response_format=b64_json" \
 *   -F "file=@image.png"
 * 
 * Input requirements:
 * - File formats: PNG, JPG, WEBP
 * - Max file size: 5 MB
 * - Resolution: Up to 4 megapixels
 * - Dimensions: 32-4096 pixels per side
 * 
 * @param imageData - Base64 encoded image with data URI prefix (e.g., "data:image/png;base64,...")
 * @returns Base64 encoded upscaled image (typically 2x resolution)
 */
export async function crispUpscaleWithRecraft(imageData: string): Promise<string> {
  try {
    console.log('🔍 Upscaling image with Recraft Crisp Upscale...');
    
    // Remove data URI prefix if present to get raw base64
    const base64Data = imageData.includes(',') 
      ? imageData.split(',')[1] 
      : imageData;
    
    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Check file size (max 5MB)
    const fileSizeMB = imageBuffer.length / (1024 * 1024);
    if (fileSizeMB > 5) {
      console.warn(`⚠️ Image size (${fileSizeMB.toFixed(2)}MB) exceeds 5MB limit, may fail`);
    }
    console.log(`📊 Input image size: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
    
    // Create a Blob from the buffer for FormData
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    
    // Create FormData for multipart/form-data (as required by Recraft API)
    const formData = new FormData();
    formData.append('response_format', 'b64_json');  // Request base64 JSON response
    formData.append('file', blob, 'image.png');      // Attach the image file
    
    // Call Recraft's Crisp Upscale API
    const response = await fetch('https://external.api.recraft.ai/v1/images/crispUpscale', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
        // DON'T set Content-Type - FormData handles it automatically with boundary
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Recraft Crisp Upscale error (${response.status}):`, errorText);
      throw new Error(`Recraft Crisp Upscale failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📦 Recraft Crisp Upscale response structure:', Object.keys(data));
    
    // Extract the upscaled image from response
    // Try multiple possible response structures based on Recraft docs
    let upscaledImageBase64: string | undefined;
    
    if (typeof data.image === 'string') {
      // Direct string
      upscaledImageBase64 = data.image;
    } else if (data.image && typeof data.image === 'object') {
      // Try various object structures
      upscaledImageBase64 = 
        data.image.url ||           // URL format
        data.image.data ||          // Possible: image.data
        data.image.b64_json ||      // Possible: image.b64_json
        data.image.base64;          // Possible: image.base64
    } else if (data.data?.[0]?.b64_json) {
      // Array format
      upscaledImageBase64 = data.data[0].b64_json;
    } else if (data.b64_json) {
      // Direct b64_json field
      upscaledImageBase64 = data.b64_json;
    }
    
    if (!upscaledImageBase64) {
      console.error('❌ No image data in Recraft Crisp Upscale response. Full response:', JSON.stringify(data).substring(0, 1000));
      throw new Error('No image data returned from Recraft Crisp Upscale');
    }
    
    // Validate the upscaled image data
    if (typeof upscaledImageBase64 !== 'string' || upscaledImageBase64.length < 100) {
      throw new Error(`Invalid image data from Recraft Crisp Upscale: length=${upscaledImageBase64?.length}`);
    }
    
    console.log(`✅ Crisp Upscale completed successfully (${Math.round(upscaledImageBase64.length / 1024)}KB)`);
    
    // Detect the actual image format from magic bytes (first few characters of base64)
    let mimeType = 'image/png'; // default
    const magicBytes = upscaledImageBase64.substring(0, 8);
    
    if (magicBytes.startsWith('UklGR')) {
      // UklGR = "RIFF" in base64 = WEBP format
      mimeType = 'image/webp';
      console.log('🖼️ Upscaled image: WEBP format');
    } else if (magicBytes.startsWith('iVBOR')) {
      // iVBOR = PNG signature in base64
      mimeType = 'image/png';
      console.log('🖼️ Upscaled image: PNG format');
    } else if (magicBytes.startsWith('/9j/')) {
      // /9j/ = JPEG signature in base64
      mimeType = 'image/jpeg';
      console.log('🖼️ Upscaled image: JPEG format');
    } else {
      console.log('⚠️ Unknown image format, using PNG as default. Magic bytes:', magicBytes);
    }
    
    // Return with proper data URI prefix (if not already included)
    if (upscaledImageBase64.startsWith('data:')) {
      return upscaledImageBase64;
    }
    return `data:${mimeType};base64,${upscaledImageBase64}`;
    
  } catch (error) {
    console.error('❌ Error upscaling with Recraft Crisp Upscale:', error);
    throw new Error(
      `Failed to upscale image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

