import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPrintifyClient, getDefaultShop } from "@/lib/printify";

async function getPrintifyCredentials(userId: string) {
  const supabase = await createClient();

  // Prefer new integrations table
  const { data: integration } = await supabase
    .from("user_integrations")
    .select("api_token, shop_id")
    .eq("user_id", userId)
    .eq("provider", "printify")
    .single();

  if (integration?.api_token) {
    return {
      apiToken: integration.api_token as string,
      shopId: integration.shop_id ? String(integration.shop_id) : undefined,
    };
  }

  // Fallback to legacy profile columns
  const { data: profile } = await supabase
    .from("profiles")
    .select("printify_api_key, printify_shop_id")
    .eq("id", userId)
    .single();

  if (profile?.printify_api_key) {
    return {
      apiToken: profile.printify_api_key as string,
      shopId: profile.printify_shop_id ? String(profile.printify_shop_id) : undefined,
    };
  }

  return null;
}

export interface ShopSettings {
  shopId: string;
  shopName: string;
  salesChannel: string;
  defaultPrintProvider?: {
    id: number;
    name: string;
  };
  mockups?: {
    position: string;
    url: string;
  }[];
  shippingProfile?: {
    name: string;
    countries: string[];
  };
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getPrintifyCredentials(user.id);
    if (!credentials?.apiToken) {
      return NextResponse.json(
        { error: "Printify not connected", connected: false },
        { status: 200 }
      );
    }

    const client = createPrintifyClient(credentials.apiToken);

    // Get shops
    const shops = await client.getShops();
    const defaultShop =
      shops.find((s) => credentials.shopId && String(s.id) === credentials.shopId) ||
      getDefaultShop(shops);

    if (!defaultShop) {
      return NextResponse.json(
        { error: "No Printify shop found", connected: true },
        { status: 200 }
      );
    }

    // Get blueprint ID from query params (optional - for mockups)
    const blueprintId = request.nextUrl.searchParams.get('blueprintId');
    const printProviderId = request.nextUrl.searchParams.get('printProviderId');

    let mockups: { position: string; url: string }[] = [];
    let shippingProfile: { name: string; countries: string[] } | undefined;

    // If blueprint ID provided, fetch mockups and shipping for that product
    if (blueprintId && printProviderId) {
      try {
        // Note: Printify doesn't have a direct mockup API, but we can get 
        // product preview images after creation. For now, return empty mockups.
        // In production, you'd store previously generated mockup URLs.

        // Get shipping info
        const shipping = await client.getShippingInfo(
          parseInt(blueprintId), 
          parseInt(printProviderId)
        ) as any;

        const from = shipping?.handling_time?.from;
        const to = shipping?.handling_time?.to;

        if (typeof from === "number" && typeof to === "number") {
          shippingProfile = {
            name: `${from}-${to} business days`,
            countries: ['US', 'CA', 'UK', 'EU'], // Simplified
          };
        }
      } catch (e) {
        console.warn('Could not fetch shipping info:', e);
      }
    }

    // Get default print provider (first recommended one)
    // This would ideally be stored per-user as a preference
    const settings: ShopSettings = {
      shopId: defaultShop.id.toString(),
      shopName: defaultShop.title,
      salesChannel: defaultShop.sales_channel,
      mockups,
      shippingProfile,
    };

    return NextResponse.json({
      success: true,
      connected: true,
      settings,
      allShops: shops.map(s => ({
        id: s.id.toString(),
        name: s.title,
        channel: s.sales_channel,
      })),
    });
  } catch (error) {
    console.error("Error fetching shop settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

