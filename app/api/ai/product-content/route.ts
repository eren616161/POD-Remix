import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAllProductContent, ProductContent } from "@/lib/ai-content";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { designName, productType, colors = [], platform = 'etsy' } = body;

    if (!designName || !productType) {
      return NextResponse.json(
        { error: "Missing required fields: designName, productType" },
        { status: 400 }
      );
    }

    // Generate content using AI
    const content: ProductContent = await generateAllProductContent(
      designName,
      productType,
      colors,
      platform as 'etsy' | 'shopify' | 'general'
    );

    return NextResponse.json({ 
      success: true, 
      content 
    });
  } catch (error) {
    console.error("Error generating product content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}

