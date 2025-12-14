import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface ProductContent {
  title: string;
  description: string;
  tags: string[];
}

/**
 * Generate a compelling product title from design name and product type
 */
export async function generateProductTitle(
  designName: string,
  productType: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Generate a catchy, SEO-friendly product title for a Print-on-Demand product.

Design Name: "${designName}"
Product Type: "${productType}"

Rules:
- Keep it under 80 characters
- Include the design theme AND product type
- Make it compelling for shoppers
- Use title case
- No quotes in the output

Examples:
- "Retro Sunset" + "T-Shirt" → "Retro Sunset Vibes Graphic Tee"
- "Gym Bear" + "Hoodie" → "Gym Bear Workout Pullover Hoodie"
- "Coffee Lover" + "Sweatshirt" → "Coffee Addict Cozy Crewneck Sweatshirt"

Return ONLY the title, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim().replace(/^["']|["']$/g, '').slice(0, 100);
  } catch (error) {
    console.error("Error generating title:", error);
    return `${designName} ${productType}`;
  }
}

/**
 * Generate a compelling product description
 */
export async function generateProductDescription(
  designName: string,
  productType: string,
  colors: string[]
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const colorList = colors.length > 0 ? colors.slice(0, 5).join(", ") : "multiple colors";

    const prompt = `Write a compelling product description for a Print-on-Demand product.

Design: "${designName}"
Product: "${productType}"
Available Colors: ${colorList}

Rules:
- 2-3 short paragraphs (150-250 words total)
- First paragraph: Capture the vibe/appeal of the design
- Second paragraph: Product quality & comfort details
- Third paragraph (optional): Who it's perfect for
- Use bullet points for key features
- Include keywords naturally for SEO
- Engaging, conversational tone
- Don't use "Introducing" or "Check out"

Return ONLY the description, no additional commentary.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error generating description:", error);
    return `Show off your style with this ${designName} ${productType}. Premium quality print on comfortable fabric. Available in multiple colors and sizes.`;
  }
}

/**
 * Generate SEO-optimized tags for the product
 * Platform-specific: Etsy allows up to 13 tags, 20 chars each
 */
export async function generateProductTags(
  designName: string,
  productType: string,
  platform: 'etsy' | 'shopify' | 'general' = 'etsy'
): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const maxTags = platform === 'etsy' ? 13 : 15;
    const maxLength = platform === 'etsy' ? 20 : 30;

    const prompt = `Generate ${maxTags} SEO-optimized tags for a Print-on-Demand product listing.

Design: "${designName}"
Product: "${productType}"
Platform: ${platform}
Max characters per tag: ${maxLength}

Rules:
- Each tag max ${maxLength} characters
- Mix of specific and broad terms
- Include: design theme, product type, style, occasion, audience
- Etsy-style tags work best (multi-word phrases)
- No hashtags, just the words
- Lowercase

Examples of good tags:
- "funny gym shirt", "workout motivation", "fitness gift", "graphic tee"

Return ONLY a JSON array of strings, like: ["tag1", "tag2", "tag3"]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Parse JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const tags = JSON.parse(jsonMatch[0]) as string[];
      return tags
        .map(t => t.toLowerCase().trim())
        .filter(t => t.length > 0 && t.length <= maxLength)
        .slice(0, maxTags);
    }
    
    // Fallback: split by commas if not JSON
    return text.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0).slice(0, maxTags);
  } catch (error) {
    console.error("Error generating tags:", error);
    // Generate basic fallback tags
    const basicTags = [
      designName.toLowerCase(),
      productType.toLowerCase(),
      `${productType} gift`,
      'graphic design',
      'unique gift',
    ];
    return basicTags.filter(t => t.length <= 20);
  }
}

/**
 * Generate all product content in one call (more efficient)
 */
export async function generateAllProductContent(
  designName: string,
  productType: string,
  colors: string[] = [],
  platform: 'etsy' | 'shopify' | 'general' = 'etsy'
): Promise<ProductContent> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const colorList = colors.length > 0 ? colors.slice(0, 5).join(", ") : "multiple colors";
    const maxTags = platform === 'etsy' ? 13 : 15;

    const prompt = `Generate complete product listing content for a Print-on-Demand product.

Design: "${designName}"
Product: "${productType}"
Colors: ${colorList}
Platform: ${platform}

Generate:
1. TITLE: Catchy, SEO-friendly, under 80 chars, includes design theme + product type
2. DESCRIPTION: 2-3 paragraphs (150-250 words), compelling, includes product details
3. TAGS: ${maxTags} SEO tags, max 20 chars each, lowercase

Return ONLY valid JSON:
{
  "title": "Your Product Title Here",
  "description": "Your full description here...",
  "tags": ["tag1", "tag2", "tag3", ...]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const content = JSON.parse(jsonMatch[0]) as ProductContent;
      
      // Validate and clean
      const rawTags = Array.isArray(content.tags)
        ? content.tags.map(t => String(t).toLowerCase().trim()).filter(t => t.length > 0 && t.length <= 20).slice(0, maxTags)
        : [];

      // Ensure we always have at least some basic tags as fallback
      const finalTags = rawTags.length > 0 ? rawTags : [
        designName.toLowerCase().slice(0, 20),
        productType.toLowerCase().slice(0, 20),
        'custom design',
        'unique gift'
      ].filter(t => t.length > 0).slice(0, maxTags);

      return {
        title: (content.title || `${designName} ${productType}`).slice(0, 100),
        description: content.description || `Show off your style with this ${designName} ${productType}. Premium quality print on comfortable fabric.`,
        tags: finalTags,
      };
    }
    
    throw new Error("Failed to parse AI response");
  } catch (error) {
    console.error("Error generating product content:", error);
    
    // Return sensible defaults
    return {
      title: `${designName} ${productType}`,
      description: `Show off your style with this ${designName} ${productType}. Premium quality print on comfortable fabric. Available in multiple colors and sizes. Makes a great gift!`,
      tags: [
        designName.toLowerCase().slice(0, 20),
        productType.toLowerCase(),
        'graphic tee',
        'unique gift',
        'custom design',
      ],
    };
  }
}

