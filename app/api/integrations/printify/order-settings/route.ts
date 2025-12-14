import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

export interface OrderSettings {
  orderRouting: {
    enabled: boolean;
    threshold: number; // in cents
  };
  orderSubmission: {
    mode: 'manual' | 'auto_1h' | 'auto_24h' | 'auto_immediate';
  };
}

async function getPrintifyCredentials(userId: string) {
  const supabase = await createClient();
  
  // Try user_integrations first
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('api_token, shop_id')
    .eq('user_id', userId)
    .eq('provider', 'printify')
    .single();
    
  if (integration?.api_token && integration?.shop_id) {
    return { apiToken: integration.api_token, shopId: integration.shop_id };
  }
  
  // Fallback to profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('printify_api_key, printify_shop_id')
    .eq('id', userId)
    .single();
    
  if (profile?.printify_api_key && profile?.printify_shop_id) {
    return { apiToken: profile.printify_api_key, shopId: profile.printify_shop_id };
  }
  
  return null;
}

// GET - Fetch current order settings from Printify
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getPrintifyCredentials(user.id);
    
    if (!credentials) {
      return NextResponse.json(
        { error: "Printify not connected", connected: false },
        { status: 200 }
      );
    }

    const { apiToken, shopId } = credentials;

    // Fetch shop details which includes order settings
    const shopResponse = await fetch(`${PRINTIFY_API_BASE}/shops/${shopId}.json`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!shopResponse.ok) {
      const error = await shopResponse.json().catch(() => ({}));
      console.error('Printify shop fetch error:', error);
      
      // Return default settings if we can't fetch
      return NextResponse.json({
        success: true,
        connected: true,
        settings: {
          orderRouting: {
            enabled: false,
            threshold: 200, // $2.00 in cents
          },
          orderSubmission: {
            mode: 'manual' as const,
          },
        },
      });
    }

    const shopData = await shopResponse.json();
    
    // Parse Printify's order settings format
    // Note: Printify API structure may vary, this handles common patterns
    const orderSettings: OrderSettings = {
      orderRouting: {
        enabled: shopData.order_routing?.enabled ?? false,
        threshold: shopData.order_routing?.threshold ?? 200,
      },
      orderSubmission: {
        mode: mapPrintifySubmissionMode(shopData.order_submission?.mode),
      },
    };

    return NextResponse.json({
      success: true,
      connected: true,
      settings: orderSettings,
      shopName: shopData.title || 'Your Shop',
    });
  } catch (error) {
    console.error("Error fetching order settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch order settings" },
      { status: 500 }
    );
  }
}

// PUT - Update order settings on Printify
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getPrintifyCredentials(user.id);
    
    if (!credentials) {
      return NextResponse.json(
        { error: "Printify not connected" },
        { status: 400 }
      );
    }

    const { apiToken, shopId } = credentials;
    const body: Partial<OrderSettings> = await request.json();

    // Update order routing if provided
    if (body.orderRouting) {
      const routingResponse = await fetch(
        `${PRINTIFY_API_BASE}/shops/${shopId}/order_routing.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enabled: body.orderRouting.enabled,
            threshold: body.orderRouting.threshold,
          }),
        }
      );

      if (!routingResponse.ok) {
        const error = await routingResponse.json().catch(() => ({}));
        console.warn('Could not update order routing:', error);
        // Don't fail entirely, continue with other updates
      }
    }

    // Update order submission mode if provided
    if (body.orderSubmission) {
      const submissionResponse = await fetch(
        `${PRINTIFY_API_BASE}/shops/${shopId}/order_submission.json`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: mapToMintifySubmissionMode(body.orderSubmission.mode),
          }),
        }
      );

      if (!submissionResponse.ok) {
        const error = await submissionResponse.json().catch(() => ({}));
        console.warn('Could not update order submission:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Order settings updated",
    });
  } catch (error) {
    console.error("Error updating order settings:", error);
    return NextResponse.json(
      { error: "Failed to update order settings" },
      { status: 500 }
    );
  }
}

// Helper to map Printify's submission mode to our format
function mapPrintifySubmissionMode(mode: string | undefined): OrderSettings['orderSubmission']['mode'] {
  switch (mode?.toLowerCase()) {
    case 'auto_immediate':
    case 'immediate':
      return 'auto_immediate';
    case 'auto_1h':
    case '1h':
    case '1hour':
      return 'auto_1h';
    case 'auto_24h':
    case '24h':
    case '24hour':
      return 'auto_24h';
    case 'manual':
    default:
      return 'manual';
  }
}

// Helper to map our format back to Printify's expected format
function mapToMintifySubmissionMode(mode: OrderSettings['orderSubmission']['mode']): string {
  switch (mode) {
    case 'auto_immediate':
      return 'immediate';
    case 'auto_1h':
      return '1h';
    case 'auto_24h':
      return '24h';
    case 'manual':
    default:
      return 'manual';
  }
}

