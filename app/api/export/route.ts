import { NextRequest, NextResponse } from 'next/server';
import { applyFiltersToDesign } from '@/lib/image-utils';

/**
 * POST /api/export
 * 
 * Exports a design with CSS filters applied.
 * Returns the original design at its native size with transparent background.
 * Ready for POD upload.
 * 
 * Request body:
 * - imageData: Base64 PNG with data URI prefix
 * - filter: CSS filter string (e.g., "brightness(1.05) contrast(1.1)")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, filter } = body;

    // Validate required fields
    if (!imageData) {
      return NextResponse.json(
        { error: 'Missing required field: imageData' },
        { status: 400 }
      );
    }

    console.log('📦 Export request received:');
    console.log(`   Filter: ${filter || 'none'}`);

    // Process the image - apply filters only, keep original size
    const exportedImage = await applyFiltersToDesign(imageData, filter || 'none');

    console.log('✅ Export complete');

    return NextResponse.json({
      success: true,
      exportedImage,
    });

  } catch (error) {
    console.error('❌ Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

