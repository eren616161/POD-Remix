import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPrintifyClient } from '@/lib/printify';
import { transformToCatalog } from '@/lib/printify-catalog';

// Cache the catalog for 1 hour
let catalogCache: { data: ReturnType<typeof transformToCatalog>; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

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
      .select('api_token')
      .eq('user_id', user.id)
      .eq('provider', 'printify')
      .single();

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: 'Printify not connected' },
        { status: 400 }
      );
    }

    // Check cache
    if (catalogCache && Date.now() - catalogCache.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        catalog: catalogCache.data,
        cached: true,
      });
    }

    // Fetch fresh catalog
    const client = createPrintifyClient(integration.api_token);
    const blueprints = await client.getCatalog();
    const catalog = transformToCatalog(blueprints);

    // Update cache
    catalogCache = {
      data: catalog,
      timestamp: Date.now(),
    };

    return NextResponse.json({
      catalog,
      cached: false,
    });
  } catch (error) {
    console.error('Printify catalog error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}

