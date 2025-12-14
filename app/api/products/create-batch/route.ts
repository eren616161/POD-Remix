import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPrintifyClient } from '@/lib/printify';
import { PresetType } from '@/lib/image-processing';
import { applyPresetServer } from '@/lib/image-processing.server';

interface BatchVariant {
  variantId: string;
  title?: string;
}

interface CreateBatchRequest {
  variants: BatchVariant[];
  blueprintId: number;
  printProviderId: number;
  lightColors: {
    preset: PresetType;
    colorIds: number[];
  };
  darkColors: {
    preset: PresetType;
    colorIds: number[];
  };
  sizes: number[];
  baseTitle: string;
  description?: string;
  price: number;
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
}

interface ProductResult {
  variantId: string;
  success: boolean;
  productId?: string;
  error?: string;
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

    const body: CreateBatchRequest = await request.json();
    const {
      variants,
      blueprintId,
      printProviderId,
      lightColors,
      darkColors,
      sizes,
      baseTitle,
      description,
      price,
      tags = [],
      shopIds,
      defaultShopId,
      syncFields,
    } = body;

    // Validate required fields
    if (!variants?.length || !blueprintId || !printProviderId || !baseTitle || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (price <= 0) {
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
        defaultShopId ||
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

    const client = createPrintifyClient(apiToken);

    // Get all variant images
    const variantIds = variants.map(v => v.variantId);
    const { data: dbVariants, error: variantError } = await supabase
      .from('variants')
      .select('id, image_url, strategy')
      .in('id', variantIds)
      .eq('user_id', user.id);

    if (variantError || !dbVariants) {
      return NextResponse.json(
        { error: 'Failed to fetch variants' },
        { status: 404 }
      );
    }

    const results: ProductResult[] = [];
    const priceInCents = Math.round(price * 100);

    // Process each variant
    for (const variant of dbVariants) {
      try {
        const userVariant = variants.find(v => v.variantId === variant.id);
        const productTitle = userVariant?.title || `${baseTitle} - ${variant.strategy}`;

        // Download the original image
        const imageResponse = await fetch(variant.image_url);
        const originalBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Upload images for light and dark color variants
        const uploadedImages: { preset: PresetType; imageId: string }[] = [];

        // Upload for light colors if any selected
        if (lightColors.colorIds.length > 0) {
          const lightBuffer = await applyPresetServer(originalBuffer, lightColors.preset);
          const lightImage = await client.uploadImageFromUrl(
            `data:image/png;base64,${lightBuffer.toString('base64')}`,
            `${productTitle}-light.png`
          );
          uploadedImages.push({ preset: lightColors.preset, imageId: lightImage.id });
        }

        // Upload for dark colors if any selected
        if (darkColors.colorIds.length > 0) {
          const darkBuffer = await applyPresetServer(originalBuffer, darkColors.preset);
          const darkImage = await client.uploadImageFromUrl(
            `data:image/png;base64,${darkBuffer.toString('base64')}`,
            `${productTitle}-dark.png`
          );
          uploadedImages.push({ preset: darkColors.preset, imageId: darkImage.id });
        }

        // Build product variants with pricing
        const productVariants = [...lightColors.colorIds, ...darkColors.colorIds]
          .filter(colorId => sizes.includes(colorId))
          .map(variantId => ({
            id: variantId,
            price: priceInCents,
            is_enabled: true,
          }));

        // Build print areas
        const printAreas = [];
        
        if (lightColors.colorIds.length > 0 && uploadedImages.length > 0) {
          printAreas.push({
            variant_ids: lightColors.colorIds,
            placeholders: [{
              position: 'front',
              images: [{
                id: uploadedImages[0].imageId,
                x: 0.5,
                y: 0.5,
                scale: 1,
                angle: 0,
              }],
            }],
          });
        }

        if (darkColors.colorIds.length > 0 && uploadedImages.length > 1) {
          printAreas.push({
            variant_ids: darkColors.colorIds,
            placeholders: [{
              position: 'front',
              images: [{
                id: uploadedImages[1].imageId,
                x: 0.5,
                y: 0.5,
                scale: 1,
                angle: 0,
              }],
            }],
          });
        }

        for (const shopId of publishShopIds) {
          const product = await client.createProduct(shopId, {
            title: productTitle,
            description: description || `Created with PodRemix`,
            blueprint_id: blueprintId,
            print_provider_id: printProviderId,
            variants: productVariants,
            print_areas: printAreas,
            tags: tags.slice(0, 13),
          });

          await client.publishProduct(shopId, product.id, {
            title: syncFields?.title ?? true,
            description: syncFields?.description ?? true,
            images: syncFields?.images ?? true,
            variants: syncFields?.variants ?? true,
            tags: syncFields?.tags ?? true,
          });

          await supabase
            .from('published_products')
            .insert({
              user_id: user.id,
              variant_id: variant.id,
              printify_product_id: product.id,
              printify_shop_id: shopId,
              blueprint_id: blueprintId,
              print_provider_id: printProviderId,
              product_type: productTitle,
              title: productTitle,
              retail_price: price,
              status: 'published',
            });

          results.push({
            variantId: variant.id,
            success: true,
            productId: product.id,
          });
        }
      } catch (error) {
        console.error(`Failed to create product for variant ${variant.id}:`, error);
        results.push({
          variantId: variant.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error('Batch product creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create products' },
      { status: 500 }
    );
  }
}

