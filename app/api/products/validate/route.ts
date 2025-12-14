import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type ValidationLevel = 'error' | 'warning';

interface ValidationIssue {
  level: ValidationLevel;
  code: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      title,
      description,
      tags = [],
      price,
      shopIds = [],
      imageCount,
      colorVariantCount,
    } = body;

    const issues: ValidationIssue[] = [];

    // Required content
    if (!title?.trim()) {
      issues.push({ level: 'error', code: 'title_missing', message: 'Add a title for your listing.' });
    }

    if (!description?.trim()) {
      issues.push({ level: 'error', code: 'description_missing', message: 'Add a description so the listing is complete.' });
    } else if (description.length < 20) {
      issues.push({ level: 'warning', code: 'description_short', message: 'Description is short. Add materials, fit, and care to improve trust.' });
    }

    // Pricing guard
    const retail = Number(price);
    if (!retail || retail <= 0) {
      issues.push({ level: 'error', code: 'price_missing', message: 'Set a price greater than 0.' });
    }

    // Images / mockups
    const images = Number(imageCount ?? 0);
    if (!images || images <= 0) {
      issues.push({ level: 'error', code: 'images_missing', message: 'Add at least one mockup image.' });
    } else if (images < 2) {
      issues.push({ level: 'warning', code: 'images_light', message: 'Add a couple more mockups to help the listing look complete.' });
    }

    const colors = Number(colorVariantCount ?? 0);
    if (!colors || colors <= 0) {
      issues.push({ level: 'error', code: 'variants_missing', message: 'Select at least one visible variant before publishing.' });
    }

    // Store selection
    if (!shopIds?.length) {
      issues.push({ level: 'error', code: 'shop_missing', message: 'Choose at least one store to publish to.' });
    } else if (user) {
      const { data: shops } = await supabase
        .from('user_provider_shops')
        .select('shop_id')
        .eq('user_id', user.id)
        .eq('provider', 'printify')
        .in('shop_id', shopIds.map(String));

      const authorizedShopIds = shops?.map((s) => s.shop_id) || [];
      const unauthorized = shopIds.map(String).filter((id: string) => !authorizedShopIds.includes(id));
      if (unauthorized.length) {
        issues.push({ level: 'error', code: 'shop_invalid', message: 'Selected shop is not connected.' });
      }
    }

    // Tags are optional but recommended
    if (!Array.isArray(tags) || tags.length === 0) {
      issues.push({ level: 'warning', code: 'tags_recommended', message: 'Add tags to improve Etsy SEO (optional).' });
    }

    const hasErrors = issues.some((i) => i.level === 'error');

    return NextResponse.json({
      ok: !hasErrors,
      issues,
    }, { status: 200 });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { ok: false, issues: [{ level: 'error', code: 'server_error', message: 'Failed to validate listing.' }] },
      { status: 500 }
    );
  }
}


