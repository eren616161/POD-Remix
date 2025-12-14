import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Helper to convert SVG to PNG using sharp
async function svgToPngBuffer(svgString: string, width = 2048, height = 2048): Promise<Buffer> {
  // Sharp can render SVG if we pass it as a Buffer with density option
  return await sharp(Buffer.from(svgString), { density: 300 })
    .resize(width, height, { fit: 'inside' })
    .png()
    .toBuffer();
}

/**
 * POST /api/export
 * 
 * Exports a design with proper product dimensions and 300 DPI metadata.
 * 
 * Request body:
 * - imageData: Base64 PNG with data URI prefix
 * - filter: CSS filter string (e.g., "brightness(1.05) contrast(1.1)")
 * - productWidth: Export width in pixels (e.g., 4500)
 * - productHeight: Export height in pixels (e.g., 5400)
 * - scale: Design scale percentage (e.g., 100)
 * - position: { x: number, y: number } offset from center
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      imageData, 
      filter, 
      productWidth, 
      productHeight, 
      scale = 100, 
      position = { x: 0, y: 0 } 
    } = body;

    // Validate required fields
    if (!imageData) {
      return NextResponse.json(
        { error: 'Missing required field: imageData' },
        { status: 400 }
      );
    }

    // Check if imageData is a URL instead of base64 data
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Image not fully loaded. Please wait for the image to load and try again.' },
        { status: 400 }
      );
    }

    // Validate it's a proper data URI
    if (!imageData.startsWith('data:')) {
      return NextResponse.json(
        { error: 'Invalid image data format. Expected base64 data URI.' },
        { status: 400 }
      );
    }

    if (!productWidth || !productHeight) {
      return NextResponse.json(
        { error: 'Missing required fields: productWidth, productHeight' },
        { status: 400 }
      );
    }

    console.log('📦 Export request received:');
    console.log(`   Product: ${productWidth}x${productHeight}px`);
    console.log(`   Scale: ${scale}%`);
    console.log(`   Position: (${position.x}, ${position.y})`);
    console.log(`   Filter: ${filter || 'none'}`);

    // Extract MIME type from data URI
    const mimeMatch = imageData.match(/^data:([^;,]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'unknown';
    console.log(`   MIME type: ${mimeType}`);

    // Remove data URI prefix to get raw base64
    const base64Data = imageData.includes(',')
      ? imageData.split(',')[1]
      : imageData;
    
    if (!base64Data || base64Data.length === 0) {
      return NextResponse.json(
        { error: 'Image data is empty or corrupted.' },
        { status: 400 }
      );
    }

    console.log(`   Base64 length: ${base64Data.length} chars`);
    
    // Convert base64 to Buffer
    let rawBuffer = Buffer.from(base64Data, 'base64');
    
    if (rawBuffer.length === 0) {
      return NextResponse.json(
        { error: 'Failed to decode image data.' },
        { status: 400 }
      );
    }

    console.log(`   Buffer size: ${rawBuffer.length} bytes`);

    // Check for SVG by looking at the actual content (not just MIME type)
    // SVG files start with "<?xml" or "<svg" which in base64 is "PD94" or "PHN2"
    const isSvgContent = base64Data.startsWith('PD94') || base64Data.startsWith('PHN2') ||
      rawBuffer.toString('utf-8', 0, 100).trim().startsWith('<?xml') ||
      rawBuffer.toString('utf-8', 0, 100).trim().startsWith('<svg');
    
    if (isSvgContent) {
      console.log('   Detected SVG content (from magic bytes or content inspection)');
    }

    // Handle SVG format - convert to PNG first
    if (mimeType === 'image/svg+xml' || isSvgContent) {
      console.log('   Converting SVG to PNG...');
      try {
        const svgString = rawBuffer.toString('utf-8');
        rawBuffer = await svgToPngBuffer(svgString, 2048, 2048);
        console.log(`   SVG converted to PNG: ${rawBuffer.length} bytes`);
      } catch (svgError) {
        console.error('Failed to convert SVG:', svgError);
        return NextResponse.json(
          { error: 'Failed to process SVG image. The SVG may be invalid or too complex.' },
          { status: 400 }
        );
      }
    }
    
    // Get original image metadata and format
    let metadata;
    try {
      metadata = await sharp(rawBuffer).metadata();
    } catch (metadataError) {
      console.error('Failed to read image metadata:', metadataError);
      return NextResponse.json(
        { error: `Unsupported image format (${mimeType}). Please use PNG, JPEG, or WebP.` },
        { status: 400 }
      );
    }
    console.log(`   Original format: ${metadata.format}`);
    console.log(`   Original size: ${metadata.width}x${metadata.height}px`);
    
    // Convert to PNG first to ensure compatibility (handles WEBP, etc.)
    const inputBuffer = await sharp(rawBuffer)
      .png()
      .toBuffer();
    
    // Get dimensions after conversion
    const pngMetadata = await sharp(inputBuffer).metadata();
    const origWidth = pngMetadata.width || 1000;
    const origHeight = pngMetadata.height || 1000;
    
    console.log(`   Converted to PNG: ${origWidth}x${origHeight}px`);

    // Parse CSS filter and apply with Sharp
    const filters = parseCssFilter(filter || 'none');
    
    // Calculate design size in export canvas
    // Preview uses 280px base size at 100% scale, preview canvas ~500px
    const previewBaseSize = 280;
    const previewCanvasSize = 500;
    const exportScale = Math.min(productWidth, productHeight) / previewCanvasSize;
    
    // Calculate scaled size maintaining aspect ratio
    const imgAspect = origWidth / origHeight;
    const previewDesignSize = previewBaseSize * (scale / 100);
    
    let scaledWidth: number;
    let scaledHeight: number;
    
    if (imgAspect > 1) {
      // Landscape
      scaledWidth = Math.round(previewDesignSize * exportScale);
      scaledHeight = Math.round(scaledWidth / imgAspect);
    } else {
      // Portrait or square
      scaledHeight = Math.round(previewDesignSize * exportScale);
      scaledWidth = Math.round(scaledHeight * imgAspect);
    }
    
    console.log(`   Scaled design: ${scaledWidth}x${scaledHeight}px`);

    // Apply filters to the design
    let processedDesign = sharp(inputBuffer);
    
    // Apply brightness and saturation via modulate
    if (filters.brightness !== 1 || filters.saturation !== 1) {
      processedDesign = processedDesign.modulate({
        brightness: filters.brightness,
        saturation: filters.saturation,
      });
    }
    
    // Apply contrast via linear transformation
    if (filters.contrast !== 1) {
      const a = filters.contrast;
      const b = Math.round(128 * (1 - filters.contrast));
      processedDesign = processedDesign.linear(a, b);
    }

    // Handle invert filter
    if (filters.invert) {
      processedDesign = processedDesign.negate({ alpha: false });
    }
    
    // Resize design to calculated dimensions
    const designBuffer = await processedDesign
      .resize(scaledWidth, scaledHeight, {
        kernel: 'lanczos3',
        fit: 'inside',
      })
      .png()
      .toBuffer();
    
    // Calculate position on canvas (center + offset)
    const centerX = Math.round((productWidth - scaledWidth) / 2);
    const centerY = Math.round((productHeight - scaledHeight) / 2);
    const offsetX = Math.round(position.x * exportScale);
    const offsetY = Math.round(position.y * exportScale);
    
    const left = Math.max(0, Math.min(productWidth - scaledWidth, centerX + offsetX));
    const top = Math.max(0, Math.min(productHeight - scaledHeight, centerY + offsetY));
    
    console.log(`   Position on canvas: (${left}, ${top})`);

    // Create transparent canvas and composite the design
    const outputBuffer = await sharp({
      create: {
        width: productWidth,
        height: productHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: designBuffer,
          left,
          top,
        },
      ])
      .png({
        compressionLevel: 6,
        adaptiveFiltering: true,
      })
      // Set 300 DPI metadata
      .withMetadata({
        density: 300,
      })
      .toBuffer();
    
    // Verify output
    const outputMeta = await sharp(outputBuffer).metadata();
    console.log(`   Output: ${outputMeta.width}x${outputMeta.height}px @ ${outputMeta.density || 300} DPI`);
    console.log(`   File size: ${(outputBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log('✅ Export complete');

    // Return as base64 data URI
    const exportedImage = `data:image/png;base64,${outputBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      exportedImage,
      dimensions: {
        width: productWidth,
        height: productHeight,
        dpi: 300,
      },
    });

  } catch (error) {
    console.error('❌ Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

/**
 * Parse CSS filter string into individual values
 */
function parseCssFilter(filterString: string): {
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  invert: boolean;
} {
  const result = {
    brightness: 1,
    contrast: 1,
    saturation: 1,
    sepia: 0,
    invert: false,
  };

  if (!filterString || filterString === 'none') {
    return result;
  }

  // Check for invert
  if (filterString.includes('invert(1)')) {
    result.invert = true;
  }

  // Parse brightness(1.05)
  const brightnessMatch = filterString.match(/brightness\(([\d.]+)\)/);
  if (brightnessMatch) {
    result.brightness = parseFloat(brightnessMatch[1]);
  }

  // Parse contrast(1.1)
  const contrastMatch = filterString.match(/contrast\(([\d.]+)\)/);
  if (contrastMatch) {
    result.contrast = parseFloat(contrastMatch[1]);
  }

  // Parse saturate(1.05)
  const saturateMatch = filterString.match(/saturat(?:e|ion)\(([\d.]+)\)/);
  if (saturateMatch) {
    result.saturation = parseFloat(saturateMatch[1]);
  }

  // Parse sepia(0.2)
  const sepiaMatch = filterString.match(/sepia\(([\d.]+)\)/);
  if (sepiaMatch) {
    result.sepia = parseFloat(sepiaMatch[1]);
  }

  return result;
}
