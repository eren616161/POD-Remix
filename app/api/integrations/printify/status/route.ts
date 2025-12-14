import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { connected: false },
        { status: 200 }
      );
    }

    // New schema: fetch shops and provider
    const { data: shops, error: shopsError } = await supabase
      .from('user_provider_shops')
      .select('shop_id, shop_name, sales_channel, is_default, connected_at')
      .eq('user_id', user.id)
      .eq('provider', 'printify');

    if (!shopsError && shops && shops.length > 0) {
      const defaultShop = shops.find((s) => s.is_default) || shops[0];
      return NextResponse.json({
        connected: true,
        shops: shops.map((s) => ({
          id: s.shop_id,
          name: s.shop_name,
          salesChannel: s.sales_channel,
          isDefault: !!s.is_default,
        })),
        defaultShopId: defaultShop?.shop_id,
        connectedAt: defaultShop?.connected_at,
      });
    }

    // Legacy fallback (single shop)
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'printify')
      .single();

    if (integration) {
      return NextResponse.json({
        connected: true,
        shops: [{
          id: integration.shop_id,
          name: integration.shop_name,
          salesChannel: undefined,
          isDefault: true,
        }],
        defaultShopId: integration.shop_id,
        connectedAt: integration.connected_at,
      });
    }

    return NextResponse.json({
      connected: false,
    });
  } catch (error) {
    console.error('Printify status error:', error);
    return NextResponse.json(
      { connected: false },
      { status: 200 }
    );
  }
}

