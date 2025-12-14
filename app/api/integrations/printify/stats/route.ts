import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
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

    // Get the integration
    const { data: integration, error: fetchError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'printify')
      .single();

    if (fetchError || !integration) {
      return NextResponse.json({
        connected: false,
        stats: null,
      });
    }

    // Try to get product stats from Printify API
    let productCount = 0;
    let publishedCount = 0;

    try {
      const response = await fetch(
        `https://api.printify.com/v1/shops/${integration.shop_id}/products.json`,
        {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        productCount = data.data?.length || 0;
        // Count published products
        publishedCount = data.data?.filter((p: { visible: boolean }) => p.visible)?.length || 0;
      }
    } catch (apiError) {
      console.error('Failed to fetch Printify products:', apiError);
    }

    return NextResponse.json({
      connected: true,
      stats: {
        productsCreated: productCount,
        productsPublished: publishedCount,
        shopName: integration.shop_name,
      },
    });
  } catch (error) {
    console.error('Printify stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}

