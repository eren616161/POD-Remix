import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPrintifyClient } from '@/lib/printify';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  let blueprintId: number | undefined;
  
  try {
    const { id } = await params;
    blueprintId = parseInt(id, 10);
    
    if (isNaN(blueprintId)) {
      return NextResponse.json(
        { error: 'Invalid blueprint ID' },
        { status: 400 }
      );
    }

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

    const client = createPrintifyClient(integration.api_token);

    // Get blueprint details
    console.log(`[Blueprint ${blueprintId}] Fetching blueprint details...`);
    const blueprint = await client.getBlueprint(blueprintId);
    console.log(`[Blueprint ${blueprintId}] ✓ Blueprint fetched: ${blueprint.title}`);
    
    // Get print providers
    console.log(`[Blueprint ${blueprintId}] Fetching print providers...`);
    const printProviders = await client.getPrintProviders(blueprintId);
    console.log(`[Blueprint ${blueprintId}] ✓ Found ${printProviders.length} print providers:`, printProviders.map(p => ({ id: p.id, title: p.title })));
    
    // Find Printify Choice provider first, fallback to first provider
    let targetProvider = printProviders.find(p => 
      p.title?.toLowerCase().includes('printify choice')
    );
    
    if (!targetProvider && printProviders.length > 0) {
      targetProvider = printProviders[0];
      console.log(`[Blueprint ${blueprintId}] ⚠ Printify Choice not found, using ${targetProvider.title}`);
    }
    
    // Get variants for the target print provider
    let variants = null;
    if (targetProvider) {
      try {
        console.log(`[Blueprint ${blueprintId}] Fetching variants for provider ${targetProvider.id} (${targetProvider.title})...`);
        variants = await client.getBlueprintVariants(blueprintId, targetProvider.id);
        console.log(`[Blueprint ${blueprintId}] ✓ Fetched ${variants?.variants?.length || 0} variants`);
      } catch (variantError) {
        console.error(`[Blueprint ${blueprintId}] ✗ Failed to fetch variants for provider ${targetProvider.id}:`, variantError);
        // Try first provider as fallback if Printify Choice failed
        if (printProviders.length > 0 && printProviders[0].id !== targetProvider.id) {
          try {
            console.log(`[Blueprint ${blueprintId}] Retrying with first provider ${printProviders[0].title}...`);
            variants = await client.getBlueprintVariants(blueprintId, printProviders[0].id);
            console.log(`[Blueprint ${blueprintId}] ✓ Fallback successful, fetched ${variants?.variants?.length || 0} variants`);
          } catch (fallbackError) {
            console.error(`[Blueprint ${blueprintId}] ✗ Fallback also failed:`, fallbackError);
          }
        }
      }
    } else {
      console.warn(`[Blueprint ${blueprintId}] ⚠ No print providers available`);
    }

    return NextResponse.json({
      blueprint,
      printProviders,
      variants,
    });
  } catch (error) {
    console.error('Blueprint fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blueprint details';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error stack:', errorStack);
    return NextResponse.json(
      { 
        error: errorMessage, 
        blueprintId,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined 
      },
      { status: 500 }
    );
  }
}

