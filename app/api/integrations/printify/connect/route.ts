import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPrintifyClient, getDefaultShop } from '@/lib/printify';

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

    const { apiToken, shopIds, defaultShopId } = await request.json();
    
    if (!apiToken || typeof apiToken !== 'string') {
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400 }
      );
    }

    // Validate the token by fetching shops
    const client = createPrintifyClient(apiToken);
    const { valid, shops } = await client.validateToken();

    if (!valid || shops.length === 0) {
      return NextResponse.json(
        { error: 'Invalid API token or no shops connected' },
        { status: 400 }
      );
    }

    // Resolve selected shops (allow multi-select; fallback to all)
    const selectedShops = Array.isArray(shopIds) && shopIds.length > 0
      ? shops.filter((s) => shopIds.map(String).includes(s.id.toString()))
      : shops;

    if (!selectedShops.length) {
      return NextResponse.json(
        { error: 'No shop found. Please select at least one shop to connect.' },
        { status: 400 }
      );
    }

    // Determine default shop
    const selectedDefault = defaultShopId
      ? selectedShops.find((s) => s.id.toString() === defaultShopId.toString())
      : null;
    const defaultShop = selectedDefault || getDefaultShop(selectedShops) || selectedShops[0];

    // Upsert the integration (legacy single-shop storage for compatibility)
    const integrationPayload = defaultShop ? {
      user_id: user.id,
      provider: 'printify',
      api_token: apiToken,
      shop_id: defaultShop.id.toString(),
      shop_name: defaultShop.title,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } : null;

    if (integrationPayload) {
      const { error: upsertError } = await supabase
        .from('user_integrations')
        .upsert(integrationPayload as any, {
          onConflict: 'user_id,provider'
        });

      if (upsertError) {
        console.error('Failed to save integration (legacy):', upsertError);
      }
    }


    // Upsert provider credentials (new scalable table)
    const providerPayload = {
      user_id: user.id,
      provider: 'printify',
      auth_type: 'api_token',
      credentials: { api_token: apiToken },
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: providerError } = await supabase
      .from('user_providers')
      .upsert(providerPayload as any, { onConflict: 'user_id,provider' });

    if (providerError) {
      console.error('Failed to save provider credentials:', providerError);
      return NextResponse.json(
        { error: 'Failed to save provider credentials' },
        { status: 500 }
      );
    }

    // Upsert selected shops
    const shopsPayload = selectedShops.map((shop) => ({
      user_id: user.id,
      provider: 'printify',
      shop_id: shop.id.toString(),
      shop_name: shop.title,
      sales_channel: shop.sales_channel,
      is_default: defaultShop ? shop.id === defaultShop.id : false,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: shopsError } = await supabase
      .from('user_provider_shops')
      .upsert(shopsPayload as any, { onConflict: 'user_id,provider,shop_id' });

    if (shopsError) {
      console.error('Failed to save shops:', shopsError);
      return NextResponse.json(
        { error: 'Failed to save selected shops' },
        { status: 500 }
      );
    }

    // Ensure only one default per user/provider
    if (defaultShop) {
      await (supabase as any)
        .from('user_provider_shops')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('provider', 'printify')
        .neq('shop_id', defaultShop.id.toString());
    }

    return NextResponse.json({
      success: true,
      shops: selectedShops.map(s => ({
        id: s.id.toString(),
        name: s.title,
        salesChannel: s.sales_channel,
      })),
      defaultShop: defaultShop ? {
        id: defaultShop.id.toString(),
        name: defaultShop.title,
        salesChannel: defaultShop.sales_channel,
      } : null,
    });
  } catch (error) {
    console.error('Printify connect error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Printify' },
      { status: 500 }
    );
  }
}

