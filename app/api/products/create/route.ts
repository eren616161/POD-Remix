import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPrintifyClient } from '@/lib/printify';
import { PresetType } from '@/lib/image-processing';
import { applyPresetServer } from '@/lib/image-processing.server';

interface CreateProductRequest {
  variantId: string;
  blueprintId: number;
  printProviderId: number;
  usePrintifyChoice?: boolean;
  lightColors: {
    preset: PresetType;
    colorIds: number[];
  };
  darkColors: {
    preset: PresetType;
    colorIds: number[];
  };
  sizes: number[];
  title: string;
  description?: string;
  price: number;
  designPosition?: { x: number; y: number; scale: number };
  tags?: string[];
  shopIds?: string[];
  defaultShopId?: string;
  syncFields?: {
    title?: boolean;
    description?: boolean;
    images?: boolean;
    variants?: boolean;
    tags?: boolean;
  };
  // Per-color preset mapping: { "White": "original", "Black": "invert", etc. }
  colorVersions?: Record<string, PresetType>;
}

/**
 * Transform UI design position coordinates to Printify API coordinates
 * 
 * UI Coordinates (from ColorStylePicker):
 * - x, y: Percentage offset from center of print area (-50 to +50)
 *   - x=0, y=0 means centered
 *   - x=+25 means 25% of the print area width to the right
 *   - y=-25 means 25% of the print area height upward
 * - scale: Multiplier on 70% base size (0.2 to unlimited, default 0.9)
 *   - scale=0.9 with 70% base = design takes up 63% of print area
 * 
 * Printify API Coordinates:
 * - x, y: Normalized 0-1 (0.5 = center of print area)
 *   - These position the CENTER of the design
 * - scale: Direct multiplier (1.0 = design fills entire print area width)
 * 
 * IMPORTANT: The UI uses percentage of print area dimensions for offsets,
 * while Printify uses normalized 0-1 coordinates. The conversion ensures
 * WYSIWYG - what the user sees in Step 2 is what gets printed.
 */
function transformDesignPositionForPrintify(
  uiPosition: { x: number; y: number; scale: number } | undefined
): { x: number; y: number; scale: number } {
  if (!uiPosition) {
    // Default: centered at 63% size (UI default is scale 0.9 * 70% base = 0.63)
    return { x: 0.5, y: 0.5, scale: 0.63 };
  }
  
  // UI design base size is 70% of print area, multiplied by user's scale
  // This gives us the final size as a fraction of the print area (0-1 range for Printify)
  const printifyScale = 0.7 * uiPosition.scale;
  
  // Convert UI percentage offset to Printify normalized coordinates
  // 
  // UI coordinate system:
  //   - Center is at (0, 0)
  //   - x=-50 means design center is at the left edge of print area
  //   - x=+50 means design center is at the right edge of print area
  //   - Same for y: -50 = top edge, +50 = bottom edge
  //
  // Printify coordinate system:
  //   - (0.5, 0.5) is the center of the print area
  //   - (0, 0) is top-left corner
  //   - (1, 1) is bottom-right corner
  //
  // Conversion: printify = 0.5 + (ui_percent / 100)
  // Example: ui x=+25% → printify x = 0.5 + 0.25 = 0.75 (right of center)
  // Example: ui y=-25% → printify y = 0.5 + (-0.25) = 0.25 (above center)
  
  const printifyX = 0.5 + (uiPosition.x / 100);
  const printifyY = 0.5 + (uiPosition.y / 100);
  
  // Clamp to valid range [0, 1] to prevent design going outside print area
  const result = {
    x: Math.max(0, Math.min(1, printifyX)),
    y: Math.max(0, Math.min(1, printifyY)),
    scale: printifyScale,
  };
  
  console.log('Printify position transformation:', {
    uiInput: uiPosition,
    printifyOutput: result,
    explanation: `Design at (${result.x.toFixed(2)}, ${result.y.toFixed(2)}) with scale ${result.scale.toFixed(2)} (${Math.round(result.scale * 100)}% of print area)`
  });
  
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateProductRequest = await request.json();
    const {
      variantId,
      blueprintId,
      printProviderId,
      usePrintifyChoice,
      lightColors,
      darkColors,
      sizes,
      title,
      description,
      price,
      tags = [],
      shopIds,
      defaultShopId,
      syncFields,
    } = body;

    // Ensure tags are properly formatted
    const formattedTags = Array.isArray(tags)
      ? tags
          .map(tag => String(tag).toLowerCase().trim())
          .filter(tag => tag.length > 0 && tag.length <= 20)
          .slice(0, 13)
      : [];

    // Validate required fields
    if (!variantId || !blueprintId || !printProviderId || !title || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate sizes array (should contain variant IDs)
    if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
      return NextResponse.json(
        { error: 'Validation failed: No variants selected' },
        { status: 400 }
      );
    }

    // Validate that we have at least one color variant selected
    if ((!lightColors.colorIds || lightColors.colorIds.length === 0) && 
        (!darkColors.colorIds || darkColors.colorIds.length === 0)) {
      return NextResponse.json(
        { error: 'Validation failed: No colors selected' },
        { status: 400 }
      );
    }

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Validation failed: Price is required' },
        { status: 400 }
      );
    }

    // Fetch provider credentials (new schema) with legacy fallback
    const { data: provider } = await supabase
      .from('user_providers')
      .select('credentials')
      .eq('user_id', user.id)
      .eq('provider', 'printify')
      .single();

    const { data: integration } = await supabase
      .from('user_integrations')
      .select('api_token, shop_id')
      .eq('user_id', user.id)
      .eq('provider', 'printify')
      .single();

    const apiToken =
      (provider?.credentials as any)?.api_token ||
      integration?.api_token;

    if (!apiToken) {
      return NextResponse.json(
        { error: 'Printify not connected' },
        { status: 400 }
      );
    }

    const client = createPrintifyClient(apiToken);

    // Determine shops to use
    const { data: connectedShops } = await supabase
      .from('user_provider_shops')
      .select('shop_id, is_default')
      .eq('user_id', user.id)
      .eq('provider', 'printify');

    const normalizedRequested = (shopIds || []).map(String);
    const availableShopIds = connectedShops?.map((s) => s.shop_id) || [];

    let publishShopIds: string[] = [];

    if (normalizedRequested.length > 0) {
      publishShopIds = availableShopIds.filter((id) =>
        normalizedRequested.includes(id)
      );
    } else if (availableShopIds.length > 0) {
      const defaultShop =
        connectedShops?.find((s) => s.is_default)?.shop_id ||
        connectedShops?.[0]?.shop_id;
      publishShopIds = defaultShop ? [defaultShop] : [];
    } else if (integration?.shop_id) {
      publishShopIds = [integration.shop_id];
    }

    if (!publishShopIds.length) {
      return NextResponse.json(
        { error: 'No store selected. Connect Printify and choose at least one shop.' },
        { status: 400 }
      );
    }

    const uploadShopId = publishShopIds[0];

    // Get the variant image
    const { data: variant, error: variantError } = await supabase
      .from('variants')
      .select('image_url')
      .eq('id', variantId)
      .eq('user_id', user.id)
      .single();

    if (variantError || !variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    // Resolve print provider - trust client selection (Printify Choice or manual)
    let resolvedPrintProviderId = printProviderId;

    if (!resolvedPrintProviderId) {
      return NextResponse.json(
        { error: 'No print provider available for this product.' },
        { status: 400 }
      );
    }

    // Download the original image
    const imageResponse = await fetch(variant.image_url);
    const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Fetch blueprint variants to get variant details (color names)
    // This requires both blueprint ID and print provider ID
    const blueprintVariantsResponse = await client.getBlueprintVariants(blueprintId, resolvedPrintProviderId);
    const blueprintVariants = blueprintVariantsResponse.variants || [];
    
    console.log('📋 Fetched blueprint variants:', {
      blueprintId,
      printProviderId: resolvedPrintProviderId,
      variantCount: blueprintVariants.length,
      sampleColors: blueprintVariants.slice(0, 3).map((v: any) => ({ id: v.id, color: v.options?.color, size: v.options?.size }))
    });
    console.log('🎨 Received colorVersions:', body.colorVersions);
    
    // Helper: Get color name for a variant ID
    const getColorForVariantId = (variantId: number): string | undefined => {
      const bpVariant = blueprintVariants.find((v: any) => v.id === variantId);
      const colorName = bpVariant?.options?.color;
      return colorName;
    };

    // Build variant-to-preset mapping
    // If colorVersions is provided, use it; otherwise fall back to light/dark logic
    const variantPresetMap = new Map<number, PresetType>();
    const debugMapping: Array<{variantId: number, color: string, preset: PresetType, source: string}> = [];
    
    if (body.colorVersions && Object.keys(body.colorVersions).length > 0) {
      console.log('✅ Using per-color preset mode');
      
      // Per-color preset mode
      for (const variantId of sizes) {
        const colorName = getColorForVariantId(variantId);
        
        if (!colorName) {
          console.warn(`⚠️ Could not find color for variant ${variantId}`);
          continue;
        }
        
        // Try exact match first
        let preset = body.colorVersions[colorName];
        
        // If no exact match, try case-insensitive match
        if (!preset) {
          const lowerColorName = colorName.toLowerCase();
          const matchingKey = Object.keys(body.colorVersions).find(
            key => key.toLowerCase() === lowerColorName
          );
          if (matchingKey) {
            preset = body.colorVersions[matchingKey];
          }
        }
        
        if (preset) {
          variantPresetMap.set(variantId, preset);
          debugMapping.push({ variantId, color: colorName, preset, source: 'colorVersions' });
        } else {
          // Fallback if color not in colorVersions
          const isLight = lightColors.colorIds.includes(variantId);
          const fallbackPreset = isLight ? lightColors.preset : darkColors.preset;
          variantPresetMap.set(variantId, fallbackPreset);
          debugMapping.push({ variantId, color: colorName, preset: fallbackPreset, source: 'fallback' });
          console.warn(`⚠️ No preset found for color "${colorName}" (variant ${variantId}), using fallback: ${fallbackPreset}`);
        }
      }
    } else {
      console.log('⚠️ No colorVersions provided, using legacy light/dark mode');
      
      // Legacy mode: light/dark presets only
      for (const variantId of sizes) {
        const colorName = getColorForVariantId(variantId) || 'Unknown';
        const isLight = lightColors.colorIds.includes(variantId);
        const preset = isLight ? lightColors.preset : darkColors.preset;
        variantPresetMap.set(variantId, preset);
        debugMapping.push({ variantId, color: colorName, preset, source: 'legacy' });
      }
    }
    
    console.log('🗺️ Variant-to-Preset Mapping:');
    console.table(debugMapping);

    // Group variants by preset
    const presetGroups = new Map<PresetType, number[]>();
    for (const [variantId, preset] of variantPresetMap.entries()) {
      if (!presetGroups.has(preset)) {
        presetGroups.set(preset, []);
      }
      presetGroups.get(preset)!.push(variantId);
    }

    console.log('Per-color preset mapping:', {
      totalVariants: sizes.length,
      uniquePresets: presetGroups.size,
      groups: Array.from(presetGroups.entries()).map(([preset, ids]) => ({
        preset,
        variantCount: ids.length,
      })),
    });

    // Upload one image per unique preset
    const uploadedImages = new Map<PresetType, string>();
    
    for (const [preset, variantIds] of presetGroups.entries()) {
      if (variantIds.length === 0) continue;
      
      const processedBuffer = await applyPresetServer(originalBuffer, preset);
      const uploadedImage = await client.uploadImage(
        uploadShopId,
        processedBuffer.toString('base64'),
        `${title}-${preset}.png`
      );
      uploadedImages.set(preset, uploadedImage.id);
      
      console.log(`Uploaded image for preset "${preset}": ${uploadedImage.id} (${variantIds.length} variants)`);
    }

    // Build product variants with pricing
    const priceInCents = Math.round(price * 100);
    const productVariants = sizes.map(variantId => ({
      id: variantId,
      price: priceInCents,
      is_enabled: true,
    }));

    // Transform design position from UI coordinates to Printify API coordinates
    const { x, y, scale } = transformDesignPositionForPrintify(body.designPosition);
    
    console.log('Design position transformation:', {
      input: body.designPosition,
      output: { x, y, scale }
    });
    
    // Build print areas - one per preset group
    const printAreas = [];
    
    for (const [preset, variantIds] of presetGroups.entries()) {
      const imageId = uploadedImages.get(preset);
      if (!imageId || variantIds.length === 0) continue;
      
      printAreas.push({
        variant_ids: variantIds,
        placeholders: [{
          position: 'front',
          images: [{
            id: imageId,
            x: x,
            y: y,
            scale: scale,
            angle: 0,
          }],
        }],
      });
    }
    
    console.log(`Created ${printAreas.length} print areas for ${presetGroups.size} unique presets`);

    const publishResults: {
      shopId: string;
      success: boolean;
      productId?: string;
      error?: string;
    }[] = [];

    for (const shopId of publishShopIds) {
      try {
        // Create the product on Printify
        const productPayload = {
          title,
          description: description || `Created with PodRemix`,
          blueprint_id: blueprintId,
          print_provider_id: resolvedPrintProviderId,
          variants: productVariants,
          print_areas: printAreas,
          // Create without tags first, then update them
        };

        console.log('Creating Printify product with payload:', JSON.stringify({
          ...productPayload,
          shopId,
          tagsCount: formattedTags.length,
          tagsPreview: formattedTags.slice(0, 3)
        }, null, 2));

        const product = await client.createProduct(shopId, productPayload);

        // Update product with tags if any
        if (formattedTags.length > 0) {
          console.log('Updating product with tags:', formattedTags);
          try {
            const updatedProduct = await client.updateProduct(shopId, product.id, { tags: formattedTags });
            console.log('Product updated successfully with tags. New tag count:', updatedProduct.tags?.length || 0);
          } catch (updateError) {
            console.error('Failed to update product tags:', updateError);
            // Continue with publishing even if tag update fails
          }

          // Small delay to ensure update is processed
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Publish with selective sync toggles
        const publishOptions = {
          title: syncFields?.title ?? true,
          description: syncFields?.description ?? true,
          images: syncFields?.images ?? true,
          variants: syncFields?.variants ?? true,
          tags: syncFields?.tags ?? true,
        };
        console.log('Publishing product with sync options:', publishOptions);

        try {
          await client.publishProduct(shopId, product.id, publishOptions);
          console.log('Product published successfully to shop:', shopId);

          // Check if this is an Etsy shop and handle tags separately if needed
          const shopDetails = await client.getShops();
          const currentShop = shopDetails.find(s => s.id.toString() === shopId.toString());

          if (currentShop?.sales_channel === 'etsy' && formattedTags.length > 0) {
            console.log('Published to Etsy shop. Tags may need manual setting or separate API call.');
            // Note: Etsy integration might require additional setup for tags
          }
        } catch (publishError) {
          console.error('Failed to publish product:', publishError);
          throw publishError; // Re-throw to fail the creation
        }

        // Save to our database
        const { error: saveError } = await supabase
          .from('published_products')
          .insert({
            user_id: user.id,
            variant_id: variantId,
            printify_product_id: product.id,
            printify_shop_id: shopId,
            blueprint_id: blueprintId,
            print_provider_id: resolvedPrintProviderId,
            product_type: title,
            title,
            retail_price: price,
            status: 'published',
          });

        if (saveError) {
          console.error('Failed to save product record:', saveError);
        }

        publishResults.push({ shopId, success: true, productId: product.id });
      } catch (err) {
        console.error(`Product creation failed for shop ${shopId}:`, err);
        publishResults.push({
          shopId,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const hasFailure = publishResults.some((r) => !r.success);

    return NextResponse.json({
      success: !hasFailure,
      results: publishResults,
    }, { status: hasFailure ? 207 : 200 });
  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create product' },
      { status: 500 }
    );
  }
}

