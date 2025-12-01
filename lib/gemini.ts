import { GoogleGenerativeAI } from "@google/generative-ai";

// Import shared types and utilities (client-safe)
export type { DesignAnalysis } from './design-utils';
export { deriveOptimalBackground } from './design-utils';
import type { DesignAnalysis } from './design-utils';
import { deriveOptimalBackground } from './design-utils';
import { detectRecommendedBackground } from './image-utils';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface RemixStrategy {
  id: number;
  strategy: string;
  prompt: string;
}

export interface DesignVersion {
  imageData: string;
  prompt: string;
}

export interface ColorClassification {
  recommendedBackground: 'light' | 'dark';
  productHint: string;
}

export interface GeneratedVariant {
  id: number;
  strategy: string;
  design: DesignVersion;
  colorClassification?: ColorClassification;
}

/**
 * Generate a creative project name from an image
 * Uses Gemini Vision to analyze and create a 3-4 word descriptive name
 */
export async function generateProjectName(imageData: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Look at this design image and generate a SHORT, CATCHY project name (3-4 words max).

The name should capture the essence of the design - its theme, subject, or vibe.

Examples of good names:
- "Retro Sunset Surfer"
- "Angry Gym Bear"
- "Vintage Coffee Lover"
- "Space Cat Adventure"
- "Motivational Fitness Quote"

Return ONLY the project name, nothing else. No quotes, no explanation.`;

    const imagePart = {
      inlineData: {
        data: imageData.split(",")[1] || imageData,
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const name = response.text().trim();

    // Clean up the name - remove any quotes or extra punctuation
    return name
      .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .trim()
      .slice(0, 50); // Max 50 chars
  } catch (error) {
    console.error("Error generating project name:", error);
    // Fallback to timestamp-based name
    return `Design ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
}

/**
 * Helper function to extract a string field from malformed JSON
 */
function extractField(jsonStr: string, fieldName: string): string | null {
  const regex = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)"`, 'i');
  const match = jsonStr.match(regex);
  return match ? match[1] : null;
}

/**
 * Helper function to extract an array field from malformed JSON
 */
function extractArrayField(jsonStr: string, fieldName: string): string[] | null {
  const regex = new RegExp(`"${fieldName}"\\s*:\\s*\\[([^\\]]*)\\]`, 'i');
  const match = jsonStr.match(regex);
  if (!match) return null;
  
  // Extract strings from the array
  const arrayContent = match[1];
  const items = arrayContent.match(/"([^"]*)"/g);
  return items ? items.map(item => item.replace(/"/g, '')) : [];
}

/**
 * Step 1: Analyze the uploaded POD design image
 * Uses gemini-2.5-flash with vision capability
 */
export async function analyzeImage(
  imageData: string
): Promise<DesignAnalysis> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze this image and focus ONLY on the GRAPHIC DESIGN element itself, completely ignoring any t-shirt, mockup, clothing, or background.

🎯 MOCKUP vs DESIGN - CRITICAL:
- If image shows a design ON a product (shirt, mug, poster, etc.):
  → Analyze ONLY the graphic/text design element
  → COMPLETELY IGNORE: product, fabric, background, shadows, wrinkles, folds
  → Describe what the ISOLATED design looks like (as if extracted)

- If image is already an isolated design:
  → Analyze the design elements directly
  
FOCUS: Describe only the visual design that would be recreated, not the mockup

📋 DESIGN TYPE CLASSIFICATION:
Classify the design into one of these categories:
- "text_only": Design is 90%+ text/typography with minimal or no graphics (e.g., quotes, word art, typographic designs)
- "graphic_only": Design is 90%+ graphics/illustrations with no text or only tiny brand marks (e.g., character art, logos, icons)
- "mixed": Design combines significant text AND graphics (both are core elements, roughly 30-70% split)

📋 COLOR EXTRACTION (CRITICAL):
- "graphic_colors": Colors used in graphics/illustrations ONLY (not text). List 2-4 main colors.
- "text_color": The EXACT color of the main text in the design.
  → Examples: "white", "black", "red", "yellow", "cream"
  → If design has NO text, use "none"
  → Be SPECIFIC (e.g., "white" not "light", "black" not "dark")

📋 CHARACTER/SUBJECT ACTION (CRITICAL):
- "character_action": Describe what the main character/subject is DOING
  → Be SPECIFIC: "lifting a barbell", "sitting on a chair", "flexing muscles", "holding coffee"
  → If no character/subject with an action, use "none"
  → This MUST be preserved in all variants

📋 TEXT EXTRACTION (CRITICAL):
- Read text CHARACTER BY CHARACTER - stylized/curved fonts are tricky
- Watch for common OCR mistakes: "I" missing, letters dropped, words misread
- Use CONTEXT: "I HEAR BANJOS" not "WEAR BAJOS" - phrases should make sense
- Include ALL visible text lines

Return ONLY valid JSON conforming to the schema below. Do not include any markdown formatting or additional text.

{
  "theme": "main subject/concept of the GRAPHIC DESIGN ONLY (not the mockup)",
  "style": "artistic style of the GRAPHIC (e.g., cartoon, vintage, minimalist, retro, bold)",
  "graphic_colors": ["color1", "color2", "color3"],
  "text": "exact visible text, read carefully character by character",
  "design_type": "text_only" | "graphic_only" | "mixed",
  "tone": "emotional feel of the design (e.g., funny, sarcastic, wholesome, edgy, motivational, cute)",
  "typography_style": "font style description (e.g., bold sans-serif, hand-drawn script, retro block letters, elegant serif) or empty if no text",
  "text_color": "the exact color of the main text (e.g., white, black, red) or none if no text",
  "character_action": "what the main character/subject is doing (e.g., lifting barbell, sitting, running) or none"
}`;

    // Convert base64 to the format Gemini expects
    const imagePart = {
      inlineData: {
        data: imageData.split(",")[1] || imageData, // Remove data:image/... prefix if present
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log("🤖 Gemini analysis raw response:", text);

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from response");
    }

    let jsonStr = jsonMatch[0];
    console.log("📋 Extracted JSON:", jsonStr);

    // Try to parse with better error handling
    try {
      // First attempt: parse as-is
      const analysis: DesignAnalysis = JSON.parse(jsonStr);
      console.log("✅ Analysis JSON parsed successfully");
      return analysis;
    } catch (firstError) {
      console.log("⚠️ First parse failed, attempting to clean JSON...");
      
      try {
        // Clean the JSON string by fixing common issues
        jsonStr = jsonStr
          // Remove any trailing commas before closing braces/brackets
          .replace(/,(\s*[}\]])/g, '$1')
          // Fix any unescaped quotes within string values (be careful here)
          .replace(/:\s*"([^"]*)"([^",}\]]*)"([^"]*)"(\s*[,}\]])/g, (match, p1, p2, p3, p4) => {
            // If there's text between quotes, it's likely an unescaped quote
            if (p2.trim().length > 0) {
              return `: "${p1}\\"${p2}\\"${p3}"${p4}`;
            }
            return match;
          });
        
        // Try parsing again
        const analysis: DesignAnalysis = JSON.parse(jsonStr);
        console.log("✅ Analysis JSON cleaned and parsed successfully");
        return analysis;
      } catch (secondError) {
        console.error("❌ Failed to parse even after cleaning");
        console.error("Original error:", firstError);
        console.error("Cleaning error:", secondError);
        console.error("JSON string:", jsonStr);
        
        // Last resort: try to manually extract fields
        try {
          console.log("⚠️ Attempting manual field extraction...");
          
          const analysis: DesignAnalysis = {
            theme: extractField(jsonStr, 'theme') || 'Unknown',
            style: extractField(jsonStr, 'style') || 'Unknown',
            graphic_colors: extractArrayField(jsonStr, 'graphic_colors') || extractArrayField(jsonStr, 'colors') || ['black', 'white'],
            text: extractField(jsonStr, 'text') || '',
            design_type: (extractField(jsonStr, 'design_type') || 'mixed') as "text_only" | "graphic_only" | "mixed",
            tone: extractField(jsonStr, 'tone') || 'neutral',
            typography_style: extractField(jsonStr, 'typography_style') || '',
            text_color: extractField(jsonStr, 'text_color') || 'none',
            character_action: extractField(jsonStr, 'character_action') || 'none'
          };
          
          console.log("✅ Manual extraction successful:", analysis);
          return analysis;
        } catch (thirdError) {
          console.error("❌ Manual extraction also failed");
          throw firstError; // Throw original error for debugging
        }
      }
    }
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error(
      `Failed to analyze image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Step 2: Generate 4 remix strategies based on the design analysis
 * Uses gemini-2.5-flash for text generation
 * 
 * NEW STRATEGIES (POD-focused, high similarity):
 * 1. Safe Recreation - Holistic small tweaks (85-93% similar)
 * 2. Phrase Variation - Text/wording changes only (80-90% similar)
 * 3. Element Tweak - Small decorative details (85-95% similar)
 * 4. Artistic Treatment - Rendering style changes (85-93% similar)
 */
export async function generateRemixStrategies(
  analysis: DesignAnalysis
): Promise<RemixStrategy[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Generate prompts that focus ONLY on design elements
    // Background removal happens after generation - don't mention backgrounds

    const prompt = `Based on this design analysis:
${JSON.stringify(analysis, null, 2)}

Create 4 remix strategies as a JSON array.

🎯 WHAT TO GENERATE:
- Flat 2D graphic illustrations (clipart style)
- Just the design elements: characters, text, graphics
- NO t-shirts, products, or mockups

⚠️ POSE PRESERVATION:
Character action: "${analysis.character_action || 'preserve original pose'}"
ALL variants must show the SAME pose/action.

📋 THE 4 STRATEGIES:

1. **Safe Recreation**: Recreate with tiny proportion tweaks. Same pose.
2. **Phrase Variation**: Change text wording only. Same everything else. Typography: "${analysis.typography_style || 'same style'}"
3. **Element Tweak**: One tiny decorative change. Nearly identical otherwise.
4. **Artistic Treatment**: Different rendering (line weight, texture). Same content.

🎨 PROMPT RULES:
- Keep prompts SHORT (under 400 characters)
- Describe the design elements only (characters, text, graphics)
- Do NOT mention backgrounds, canvas size, or colors
- Do NOT say "no container box" - just don't add one
- Style: "${analysis.style}", Tone: "${analysis.tone || 'original'}"

❌ NEVER MENTION: background, canvas, dark, light, container, box, frame

Return ONLY JSON array:
[
  {"id": 1, "strategy": "Safe Recreation", "prompt": "..."},
  {"id": 2, "strategy": "Phrase Variation", "prompt": "..."},
  {"id": 3, "strategy": "Element Tweak", "prompt": "..."},
  {"id": 4, "strategy": "Artistic Treatment", "prompt": "..."}
]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("🤖 Gemini raw response:", text);

    // Parse the JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON array from response");
    }

    let jsonStr = jsonMatch[0];
    console.log("📋 Extracted JSON strategies (count check):", jsonStr.match(/"id":\s*\d+/g)?.length || 0, "strategies found");

    // Clean common JSON issues from LLM responses
    // Fix unescaped quotes and backslashes in prompt strings
    try {
      // First attempt: parse as-is
      const strategies: RemixStrategy[] = JSON.parse(jsonStr);
      console.log("✅ JSON parsed successfully");
      
      // Validate we got 4 strategies
      if (strategies.length !== 4) {
        throw new Error(`Expected 4 strategies, got ${strategies.length}`);
      }
      
      return strategies;
    } catch (firstError) {
      console.log("⚠️ First parse failed, attempting to clean JSON...");
      
      // Try to fix common issues
      try {
        // More robust parsing - find objects by looking for id fields
        const strategies: RemixStrategy[] = [];
        
        // Split by object boundaries more carefully
        const objectRegex = /\{\s*"id"\s*:\s*(\d+)\s*,\s*"strategy"\s*:\s*"([^"]+)"\s*,\s*"prompt"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
        let match;
        
        while ((match = objectRegex.exec(jsonStr)) !== null) {
          strategies.push({
            id: parseInt(match[1]),
            strategy: match[2],
            prompt: match[3]
              // Clean up escape sequences
              .replace(/\\n/g, ' ')
              .replace(/\\r/g, '')
              .replace(/\\t/g, ' ')
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, '\\')
              .replace(/\s+/g, ' ')
              .trim()
          });
        }
        
        if (strategies.length === 0) {
          // Fallback: try even more lenient parsing
          console.log("⚠️ Regex extraction failed, trying line-by-line...");
          
          // Extract by looking for the fields separately
          const ids = [...jsonStr.matchAll(/"id"\s*:\s*(\d+)/g)].map(m => parseInt(m[1]));
          const stratNames = [...jsonStr.matchAll(/"strategy"\s*:\s*"([^"]+)"/g)].map(m => m[1]);
          const prompts = [...jsonStr.matchAll(/"prompt"\s*:\s*"([^"]+(?:[^"\\]|\\.)*)"/g)].map(m => 
            m[1]
              .replace(/\\n/g, ' ')
              .replace(/\\r/g, '')
              .replace(/\\t/g, ' ')
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, '\\')
              .replace(/\s+/g, ' ')
              .trim()
          );
          
          if (ids.length === 4 && stratNames.length === 4 && prompts.length === 4) {
            for (let i = 0; i < 4; i++) {
              strategies.push({
                id: ids[i],
                strategy: stratNames[i],
                prompt: prompts[i]
              });
            }
          } else {
            throw new Error(`Mismatched field counts: ${ids.length} ids, ${stratNames.length} strategies, ${prompts.length} prompts`);
          }
        }
        
        console.log("✅ JSON cleaned and parsed successfully");
        
        // Validate we got 4 strategies
        if (strategies.length !== 4) {
          throw new Error(`Expected 4 strategies, got ${strategies.length}`);
        }
        
        return strategies;
      } catch (secondError) {
        console.error("❌ Failed to parse even after cleaning");
        console.error("Original error:", firstError);
        console.error("Cleaning error:", secondError);
        console.error("JSON string:", jsonStr);
        throw firstError; // Throw original error for debugging
      }
    }
  } catch (error) {
    console.error("Error generating remix strategies:", error);
    throw new Error(
      `Failed to generate remix strategies: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Helper function to extract image data from Gemini response
 */
function extractImageFromGeminiResponse(response: any): string {
  try {
    // Gemini returns generated images in response.candidates[0].content.parts
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (!parts) {
      throw new Error('No parts in Gemini response');
    }
    
    // Find the image part (inlineData)
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        const base64Data = part.inlineData.data;
        return `data:${mimeType};base64,${base64Data}`;
      }
    }
    
    throw new Error('No image data found in Gemini response');
  } catch (error) {
    console.error("Error extracting image from Gemini response:", error);
    throw new Error(
      `Failed to extract image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * VALIDATION LAYER: Check if generated image is usable
 * Uses Gemini Vision to detect product mockups (t-shirts, etc.)
 * 
 * @param imageData - Base64 encoded image to validate
 * @returns Object with isIsolatedDesign boolean and reason string
 */
async function validateGeneratedImage(imageData: string): Promise<{ isIsolatedDesign: boolean; reason: string }> {
  try {
    console.log('🔍 Validating generated image...');
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `Is this image a PRODUCT MOCKUP or just GRAPHIC ARTWORK?

❌ PRODUCT MOCKUP: Design shown ON a t-shirt, mug, hoodie, poster, or any physical product
✅ GRAPHIC ARTWORK: Just the flat graphic/illustration (even if it has a colored background)

Respond with ONLY valid JSON:
{
  "isProductMockup": true/false,
  "reason": "brief explanation"
}`;

    const imagePart = {
      inlineData: {
        data: imageData.split(",")[1] || imageData,
        mimeType: "image/png",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('⚠️ Could not parse validation response, assuming valid');
      return { isIsolatedDesign: true, reason: 'Validation parse failed, proceeding' };
    }
    
    const validation = JSON.parse(jsonMatch[0]);
    
    console.log(`🔍 Validation: Mockup=${validation.isProductMockup} - ${validation.reason}`);
    
    return { 
      isIsolatedDesign: !validation.isProductMockup, 
      reason: validation.reason 
    };
  } catch (error) {
    console.error('⚠️ Validation error:', error);
    return { isIsolatedDesign: true, reason: 'Validation error, proceeding anyway' };
  }
}

/**
 * Generate image with Gemini using different prompt tiers
 * Each tier is progressively more aggressive about preventing mockups
 * 
 * Background removal happens AFTER generation, so we don't specify
 * any background color in the prompts - just focus on the design elements.
 */
async function generateWithGeminiTiered(
  model: any,
  strategy: RemixStrategy,
  referenceImage: string | null,
  tier: 'normal' | 'aggressive' | 'no-reference',
  textColor?: string
): Promise<string> {
  
  // Determine if we need a colored background to preserve light-colored text/elements
  // Light colors get destroyed during background removal if generated on white/transparent
  const lightColorKeywords = ['white', 'cream', 'yellow', 'light', 'beige', 'cyan', 'pink'];
  const needsColoredBackground = textColor && 
    lightColorKeywords.some(kw => textColor.toLowerCase().includes(kw));
  
  // Background instruction - Use solid green for easy chroma-key style removal
  // CRITICAL: Must NOT ask for boxes/containers - just solid canvas fill
  const bgInstruction = needsColoredBackground 
    ? '\nCRITICAL BACKGROUND RULE: Fill the ENTIRE canvas with solid #00AA00 green color (like a green screen). The design elements (character, text, graphics) should float directly on this green - NO boxes, badges, frames, or container shapes behind them. Just green canvas + design elements.'
    : '';

  // Build prompt based on tier
  let prompt: string;
  
  const basePrompt = strategy.prompt;
  
  if (tier === 'normal') {
    prompt = `Inspired by the reference image, ${basePrompt}

Keep the EXACT same pose/action from the reference.
Generate only the design elements (characters, text, graphics).${bgInstruction}`;
  } else if (tier === 'aggressive') {
    prompt = `${basePrompt}

IMPORTANT: Generate ONLY the artwork itself - no t-shirts or products.
Keep the EXACT same pose/action.${bgInstruction}`;
  } else {
    // no-reference tier - don't use the reference image at all
    prompt = `Create a flat 2D graphic illustration: ${basePrompt}

Generate only the design elements (characters, text, graphics).${bgInstruction}`;
  }

  // Prepare content parts
  const contentParts: any[] = [prompt];
  
  // Add reference image for normal and aggressive tiers
  if (referenceImage && tier !== 'no-reference') {
    contentParts.push({
      inlineData: {
        data: referenceImage.split(",")[1] || referenceImage,
        mimeType: "image/png",
      },
    });
  }

  const result = await model.generateContent(contentParts);
  const response = await result.response;
  
  return extractImageFromGeminiResponse(response);
}

/**
 * Step 3: Generate variant images with TIERED FALLBACK SYSTEM
 * 
 * MULTI-LAYER DEFENSE AGAINST MOCKUPS:
 * 
 * TIER 1: Normal Gemini generation with reference image
 * TIER 2: Aggressive prompt with reference image  
 * TIER 3: Aggressive prompt WITHOUT reference image
 * TIER 4: Recraft fallback (GUARANTEED isolated design)
 * 
 * After generation:
 * 1. Validate output is isolated design (not mockup)
 * 2. Remove background with Recraft
 * 3. Normalize to POD-ready specs with Sharp (4500x5400, 300 DPI)
 * 
 * Each variant includes colorClassification for per-variant background selection.
 */
export async function generateVariantImages(
  originalImage: string,
  strategies: RemixStrategy[],
  analysis?: DesignAnalysis
): Promise<GeneratedVariant[]> {
  // Extract textColor for backward compatibility
  const textColor = analysis?.text_color;
  try {
    console.log("🚀 Starting variant generation with tiered fallback system...");
    
    // Use Gemini 2.5 Flash Image model (supports image input + output)
    const geminiImageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    // Import Recraft's functions
    const { removeBackgroundWithRecraft, generateVariantImagesWithRecraft } = await import('./recraft');
    
    // Import Sharp normalization
    const { normalizeToPODSize } = await import('./image-utils');

    // Generate all variants in parallel
    const generationPromises = strategies.map(async (strategy) => {
      console.log(`\n🎨 ===== VARIANT ${strategy.id}: ${strategy.strategy} =====`);
      
      let generatedImageData: string | null = null;
      let usedTier: string = '';
      
      // TIER 1: Normal generation with reference
      try {
        console.log(`📍 TIER 1: Normal generation with reference...`);
        generatedImageData = await generateWithGeminiTiered(
          geminiImageModel, 
          strategy, 
          originalImage, 
          'normal',
          textColor
        );
        
        // Validate the output
        const validation = await validateGeneratedImage(generatedImageData);
        if (validation.isIsolatedDesign) {
          usedTier = 'Tier 1 (Normal)';
          console.log(`✅ TIER 1 SUCCESS: ${validation.reason}`);
        } else {
          console.log(`❌ TIER 1 FAILED: ${validation.reason} - Moving to Tier 2`);
          generatedImageData = null;
        }
      } catch (error) {
        console.log(`❌ TIER 1 ERROR: ${error} - Moving to Tier 2`);
        generatedImageData = null;
      }
      
      // TIER 2: Aggressive prompt with reference
      if (!generatedImageData) {
        try {
          console.log(`📍 TIER 2: Aggressive prompt with reference...`);
          generatedImageData = await generateWithGeminiTiered(
            geminiImageModel, 
            strategy, 
            originalImage, 
            'aggressive',
            textColor
          );
          
          const validation = await validateGeneratedImage(generatedImageData);
          if (validation.isIsolatedDesign) {
            usedTier = 'Tier 2 (Aggressive)';
            console.log(`✅ TIER 2 SUCCESS: ${validation.reason}`);
          } else {
            console.log(`❌ TIER 2 FAILED: ${validation.reason} - Moving to Tier 3`);
            generatedImageData = null;
          }
        } catch (error) {
          console.log(`❌ TIER 2 ERROR: ${error} - Moving to Tier 3`);
          generatedImageData = null;
        }
      }
      
      // TIER 3: No reference image
      if (!generatedImageData) {
        try {
          console.log(`📍 TIER 3: Generation WITHOUT reference image...`);
          generatedImageData = await generateWithGeminiTiered(
            geminiImageModel, 
            strategy, 
            null, 
            'no-reference',
            textColor
          );
          
          const validation = await validateGeneratedImage(generatedImageData);
          if (validation.isIsolatedDesign) {
            usedTier = 'Tier 3 (No Reference)';
            console.log(`✅ TIER 3 SUCCESS: ${validation.reason}`);
          } else {
            console.log(`❌ TIER 3 FAILED: ${validation.reason} - Moving to Tier 4 (Recraft Fallback)`);
            generatedImageData = null;
          }
        } catch (error) {
          console.log(`❌ TIER 3 ERROR: ${error} - Moving to Tier 4 (Recraft Fallback)`);
          generatedImageData = null;
        }
      }
      
      // TIER 4: Recraft fallback - GUARANTEED to produce isolated design
      if (!generatedImageData) {
        try {
          console.log(`📍 TIER 4: RECRAFT FALLBACK (guaranteed isolated design)...`);
          
          // Use Recraft to generate - it ONLY produces isolated graphics
          const recraftResults = await generateVariantImagesWithRecraft([strategy]);
          
          if (recraftResults.length > 0 && recraftResults[0].design?.imageData) {
            generatedImageData = recraftResults[0].design.imageData;
            usedTier = 'Tier 4 (Recraft Fallback)';
            console.log(`✅ TIER 4 SUCCESS: Recraft generated isolated design`);
          } else {
            throw new Error('Recraft returned no image data');
          }
        } catch (error) {
          console.error(`❌ TIER 4 FAILED: ${error}`);
          throw new Error(`All generation tiers failed for variant ${strategy.id}`);
        }
      }
      
      console.log(`📊 Generation complete using: ${usedTier}`);
      
      // POST-PROCESSING PIPELINE
      console.log(`🧹 Removing background for variant ${strategy.id}...`);
      
      // Remove background using Recraft (skip if already from Recraft generation)
      let cleanedImageData: string;
      if (usedTier === 'Tier 4 (Recraft Fallback)') {
        // Recraft generation already has clean background
        cleanedImageData = generatedImageData;
        console.log(`⏭️ Skipping background removal (Recraft output already clean)`);
      } else {
        // Log input size for background removal tracking
        const inputSize = generatedImageData.length;
        cleanedImageData = await removeBackgroundWithRecraft(generatedImageData);
        const outputSize = cleanedImageData.length;
        console.log(`🧹 BG removal: ${Math.round(inputSize/1024)}KB → ${Math.round(outputSize/1024)}KB (${Math.round(outputSize/inputSize*100)}%)`);
      }
      
      // Import trim function
      const { trimTransparentPixels } = await import('./image-utils');
      
      // TRIM FIRST - before normalizing (removes excess transparent padding)
      console.log(`✂️ Trimming transparent pixels for variant ${strategy.id}...`);
      const trimmedImageData = await trimTransparentPixels(cleanedImageData);
      
      console.log(`📐 Normalizing variant ${strategy.id} to POD specs...`);
      
      // THEN normalize (center the trimmed design on POD canvas)
      // This replaces Crisp Upscale - Sharp is FREE and gives consistent dimensions
      const podReadyImageData = await normalizeToPODSize(trimmedImageData);
      
      console.log(`✅ Variant ${strategy.id} complete (${usedTier} → BG removed → POD normalized)`);
      
      // Derive color classification using per-variant pixel analysis
      // This analyzes the actual generated design colors, not the original analysis
      let colorClassification: ColorClassification;
      try {
        // Use per-variant color detection on the cleaned image (after background removal)
        const recommendedBg = await detectRecommendedBackground(cleanedImageData);
        colorClassification = {
          recommendedBackground: recommendedBg,
          productHint: recommendedBg === 'dark' 
            ? 'Best on dark products' 
            : 'Best on light products',
        };
      } catch (e) {
        console.warn(`⚠️ Color classification failed for variant ${strategy.id}, using default`);
        colorClassification = {
          recommendedBackground: 'light',
          productHint: 'Universal design',
        };
      }
      
      console.log(`🎨 Variant ${strategy.id} color: ${colorClassification.recommendedBackground} (${colorClassification.productHint})`);
      
      return {
        id: strategy.id,
        strategy: strategy.strategy,
        design: {
          imageData: podReadyImageData,
          prompt: strategy.prompt,
        },
        colorClassification,
      };
    });
    
    const variants = await Promise.all(generationPromises);
    console.log(`\n✅ ===== ALL ${variants.length} VARIANTS GENERATED SUCCESSFULLY =====\n`);
    
    return variants;
  } catch (error) {
    console.error("Error generating variant images:", error);
    throw new Error(
      `Failed to generate variants: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
