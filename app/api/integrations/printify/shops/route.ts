import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPrintifyClient } from '@/lib/printify';

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

    const { apiToken } = await request.json();

    if (!apiToken || typeof apiToken !== 'string') {
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400 }
      );
    }

    const client = createPrintifyClient(apiToken);

    // Validate token by fetching shops
    const { valid, shops } = await client.validateToken();

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid API token' },
        { status: 400 }
      );
    }

    if (shops.length === 0) {
      return NextResponse.json(
        { error: 'No shops connected to this Printify account' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      shops: shops.map((shop) => ({
        id: shop.id.toString(),
        name: shop.title,
        salesChannel: shop.sales_channel,
      })),
    });
  } catch (error) {
    console.error('Printify shops fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Printify shops' },
      { status: 500 }
    );
  }
}

