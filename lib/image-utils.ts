import sharp from 'sharp';

// ============================================================================
// Export Processing
// ============================================================================

interface ExportOptions {
  imageData: string;
  filter: string;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  position: { x: number; y: number };
}

/**
 * Parse CSS filter string into individual filter values
 * Supports: brightness, contrast, saturate, sepia
 */
function parseCssFilter(filterString: string): {
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
} {
  const result = {
    brightness: 1,
    contrast: 1,
    saturation: 1,
    sepia: 0,
  };

  if (!filterString || filterString === 'none') {
    return result;
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

  // Parse saturate(1.05) or saturation(1.05)
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

/**
 * Apply CSS-like filters to a design image (simplified export)
 * 
 * This function:
 * 1. Parses CSS filter string into Sharp operations
 * 2. Applies brightness, contrast, saturation, sepia adjustments
 * 3. Returns the image at its original size with transparent background
 * 
 * @param imageData - Base64 encoded image with data URI prefix
 * @param filter - CSS filter string (e.g., "brightness(1.05) contrast(1.1)")
 * @returns Base64 encoded PNG data URI
 */
export async function applyFiltersToDesign(imageData: string, filter: string): Promise<string> {
  try {
    console.log('🎨 Applying filters to design...');
    
    // Remove data URI prefix to get raw base64
    const base64Data = imageData.includes(',')
      ? imageData.split(',')[1]
      : imageData;
    
    // Convert base64 to Buffer
    const inputBuffer = Buffer.from(base64Data, 'base64');
    
    // Get original dimensions
    const metadata = await sharp(inputBuffer).metadata();
    console.log(`   Size: ${metadata.width}x${metadata.height}`);
    
    // Parse CSS filter
    const filters = parseCssFilter(filter);
    console.log(`   Filters: brightness=${filters.brightness}, contrast=${filters.contrast}, saturation=${filters.saturation}, sepia=${filters.sepia}`);
    
    // If no filters, return original
    if (filter === 'none' || (!filters.brightness && !filters.contrast && !filters.saturation && !filters.sepia)) {
      console.log('   No filters to apply, returning original');
      return imageData;
    }
    
    // Apply filters
    let processedImage = sharp(inputBuffer);
    
    // Apply modulate for brightness and saturation
    if (filters.brightness !== 1 || filters.saturation !== 1) {
      processedImage = processedImage.modulate({
        brightness: filters.brightness,
        saturation: filters.saturation,
      });
    }
    
    // Apply contrast using linear transformation
    if (filters.contrast !== 1) {
      const a = filters.contrast;
      const b = Math.round(128 * (1 - filters.contrast));
      processedImage = processedImage.linear(a, b);
    }
    
    // Apply sepia tint if needed
    if (filters.sepia > 0) {
      // Sepia is achieved by tinting towards warm brown tones
      // We'll use a combination of saturation reduction and tint
      processedImage = processedImage.tint({ r: 112, g: 66, b: 20 });
    }
    
    // Output as PNG with transparency
    const outputBuffer = await processedImage
      .png({
        compressionLevel: 6,
        adaptiveFiltering: true,
      })
      .toBuffer();
    
    console.log(`   Output size: ${(outputBuffer.length / 1024).toFixed(1)} KB`);
    console.log('✅ Filters applied');
    
    // Return as data URI
    return `data:image/png;base64,${outputBuffer.toString('base64')}`;
    
  } catch (error) {
    console.error('❌ Error applying filters:', error);
    throw new Error(
      `Failed to apply filters: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Apply CSS-like filters and composite design onto a canvas
 * 
 * This function:
 * 1. Parses CSS filter string into Sharp operations
 * 2. Applies brightness, contrast, saturation adjustments
 * 3. Scales the design by the given factor
 * 4. Creates a transparent canvas at target size
 * 5. Composites the design onto the canvas at the specified position
 * 
 * @param options - Export configuration options
 * @returns Base64 encoded PNG data URI
 */
export async function applyFiltersAndComposite(options: ExportOptions): Promise<string> {
  try {
    const { imageData, filter, canvasWidth, canvasHeight, scale, position } = options;
    
    console.log('🎨 Applying filters and compositing...');
    
    // Remove data URI prefix to get raw base64
    const base64Data = imageData.includes(',')
      ? imageData.split(',')[1]
      : imageData;
    
    // Convert base64 to Buffer
    const inputBuffer = Buffer.from(base64Data, 'base64');
    
    // Get original dimensions
    const metadata = await sharp(inputBuffer).metadata();
    const origWidth = metadata.width || 1000;
    const origHeight = metadata.height || 1000;
    
    console.log(`   Original: ${origWidth}x${origHeight}`);
    
    // Parse CSS filter
    const filters = parseCssFilter(filter);
    console.log(`   Filters: brightness=${filters.brightness}, contrast=${filters.contrast}, saturation=${filters.saturation}`);
    
    // Calculate scaled dimensions
    const scaledWidth = Math.round(origWidth * scale);
    const scaledHeight = Math.round(origHeight * scale);
    
    console.log(`   Scaled: ${scaledWidth}x${scaledHeight} (${Math.round(scale * 100)}%)`);
    
    // Apply filters and resize
    let processedImage = sharp(inputBuffer);
    
    // Apply modulate for brightness and saturation
    // Sharp's modulate uses multipliers similar to CSS
    if (filters.brightness !== 1 || filters.saturation !== 1) {
      processedImage = processedImage.modulate({
        brightness: filters.brightness,
        saturation: filters.saturation,
      });
    }
    
    // Apply contrast using linear transformation
    // CSS contrast of 1.1 means 10% more contrast
    // Sharp doesn't have direct contrast, so we use linear with a and b parameters
    // a = contrast, b = (1 - contrast) * 128 / contrast (for preserving mid-tones)
    if (filters.contrast !== 1) {
      const a = filters.contrast;
      const b = Math.round(128 * (1 - filters.contrast));
      processedImage = processedImage.linear(a, b);
    }
    
    // Resize to scaled dimensions
    processedImage = processedImage.resize(scaledWidth, scaledHeight, {
      kernel: 'lanczos3',
      fit: 'inside',
      withoutEnlargement: false,
    });
    
    // Get the processed image buffer
    const processedBuffer = await processedImage.png().toBuffer();
    
    // Calculate composite position (center + offset)
    // Position is the offset from center, and we need to convert UI pixels to export pixels
    // The UI canvas is ~400px wide, export canvas might be 4000px
    const uiToExportRatio = canvasWidth / 400; // Assuming UI canvas base is 400px
    
    const centerX = Math.round((canvasWidth - scaledWidth) / 2);
    const centerY = Math.round((canvasHeight - scaledHeight) / 2);
    
    // Scale position from UI coordinates to export coordinates
    const offsetX = Math.round(position.x * uiToExportRatio);
    const offsetY = Math.round(position.y * uiToExportRatio);
    
    const left = Math.max(0, Math.min(canvasWidth - scaledWidth, centerX + offsetX));
    const top = Math.max(0, Math.min(canvasHeight - scaledHeight, centerY + offsetY));
    
    console.log(`   Position: left=${left}, top=${top} (offset: ${offsetX}, ${offsetY})`);
    
    // Create transparent canvas and composite the design
    const outputBuffer = await sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: processedBuffer,
          left,
          top,
        },
      ])
      .png({
        compressionLevel: 6,
        adaptiveFiltering: true,
      })
      .toBuffer();
    
    console.log(`   Output: ${canvasWidth}x${canvasHeight}`);
    console.log(`   Size: ${(outputBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log('✅ Filters applied and composited');
    
    // Return as data URI
    return `data:image/png;base64,${outputBuffer.toString('base64')}`;
    
  } catch (error) {
    console.error('❌ Error applying filters:', error);
    throw new Error(
      `Failed to apply filters: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// Image Trimming
// ============================================================================

/**
 * Trim transparent pixels from around the design
 * 
 * Uses Sharp's trim() with a LOW threshold to remove excess transparent
 * padding while preserving anti-aliased edges. Adds safety padding after
 * trimming to prevent edge clipping during POD normalization.
 * 
 * @param imageData - Base64 encoded image with data URI prefix
 * @returns Trimmed image as base64 data URI
 */
export async function trimTransparentPixels(imageData: string): Promise<string> {
  try {
    console.log('✂️ Trimming transparent pixels...');
    
    // Remove data URI prefix to get raw base64
    const base64Data = imageData.includes(',') 
      ? imageData.split(',')[1] 
      : imageData;
    
    // Convert base64 to Buffer
    const inputBuffer = Buffer.from(base64Data, 'base64');
    
    // Get original dimensions for logging
    const originalMeta = await sharp(inputBuffer).metadata();
    console.log(`   Original: ${originalMeta.width}x${originalMeta.height}`);
    
    // Trim transparent pixels with LOW threshold (5) to preserve anti-aliased text edges
    // Higher values (10+) were clipping text like "DON'T" → "ON'T"
    const trimmedBuffer = await sharp(inputBuffer)
      .trim({
        threshold: 5, // Low tolerance to preserve anti-aliased edges
      })
      .png()
      .toBuffer();
    
    // Get trimmed dimensions
    const trimmedMeta = await sharp(trimmedBuffer).metadata();
    const trimmedWidth = trimmedMeta.width || 100;
    const trimmedHeight = trimmedMeta.height || 100;
    console.log(`   Trimmed: ${trimmedWidth}x${trimmedHeight}`);
    
    // Add 2% safety padding (min 20px) to prevent edge clipping during normalization
    const padX = Math.max(20, Math.round(trimmedWidth * 0.02));
    const padY = Math.max(20, Math.round(trimmedHeight * 0.02));
    
    const paddedBuffer = await sharp(trimmedBuffer)
      .extend({
        top: padY,
        bottom: padY,
        left: padX,
        right: padX,
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent padding
      })
      .png()
      .toBuffer();
    
    const finalMeta = await sharp(paddedBuffer).metadata();
    console.log(`   Padded: ${finalMeta.width}x${finalMeta.height} (+${padX}px x, +${padY}px y)`);
    console.log('✅ Trimming complete');
    
    // Return as data URI
    return `data:image/png;base64,${paddedBuffer.toString('base64')}`;
    
  } catch (error) {
    console.error('❌ Error trimming image:', error);
    // If trimming fails, return original image
    console.log('⚠️ Trimming failed, using original image');
    return imageData;
  }
}

/**
 * Detect the recommended background color for a design based on its actual colors
 * 
 * Analyzes the pixel data of the image to determine if it's light or dark:
 * - Light designs (high luminance) need dark backgrounds for contrast
 * - Dark designs (low luminance) need light backgrounds for contrast
 * 
 * @param imageData - Base64 encoded image with data URI prefix
 * @returns 'dark' if design is light (needs dark bg), 'light' if design is dark (needs light bg)
 */
export async function detectRecommendedBackground(imageData: string): Promise<'light' | 'dark'> {
  try {
    console.log('🔍 Detecting recommended background...');
    
    // Remove data URI prefix to get raw base64
    const base64Data = imageData.includes(',') 
      ? imageData.split(',')[1] 
      : imageData;
    
    // Convert base64 to Buffer
    const inputBuffer = Buffer.from(base64Data, 'base64');
    
    // Extract raw RGBA pixel data
    const { data, info } = await sharp(inputBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    let totalLuminance = 0;
    let visiblePixelCount = 0;
    
    // Process each pixel (RGBA = 4 bytes per pixel)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Only consider non-transparent pixels (alpha > 50)
      if (a > 50) {
        // Calculate luminance using standard formula
        // Y = 0.299*R + 0.587*G + 0.114*B
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += luminance;
        visiblePixelCount++;
      }
    }
    
    // Calculate average luminance
    const avgLuminance = visiblePixelCount > 0 
      ? totalLuminance / visiblePixelCount 
      : 128; // Default to mid-gray if no visible pixels
    
    console.log(`   Analyzed ${visiblePixelCount} visible pixels`);
    console.log(`   Average luminance: ${avgLuminance.toFixed(1)} / 255`);
    
    // Light designs (luminance > 120) need dark backgrounds
    // Dark designs (luminance <= 120) need light backgrounds
    const recommendedBg = avgLuminance > 120 ? 'dark' : 'light';
    
    console.log(`   Recommendation: ${recommendedBg} background (design is ${avgLuminance > 120 ? 'light' : 'dark'})`);
    
    return recommendedBg;
    
  } catch (error) {
    console.error('❌ Error detecting background:', error);
    // Default to light background on error
    return 'light';
  }
}

/**
 * POD-ready image dimensions
 * Standard t-shirt print area: 15" x 18" at 300 DPI = 4500 x 5400 pixels
 */
export const POD_CONFIG = {
  width: 4500,
  height: 5400,
  dpi: 300,
} as const;

/**
 * Normalize an image to POD-ready specifications
 * 
 * This function:
 * 1. Resizes to exact POD dimensions (4500x5400)
 * 2. Sets 300 DPI metadata
 * 3. Preserves transparency
 * 4. Applies sharpening for crisp output
 * 5. Centers the design within the canvas
 * 
 * @param imageData - Base64 encoded image with data URI prefix
 * @returns Base64 encoded PNG, POD-ready (4500x5400, 300 DPI, transparent)
 */
export async function normalizeToPODSize(imageData: string): Promise<string> {
  try {
    console.log('📐 Normalizing image to POD specifications...');
    console.log(`   Target: ${POD_CONFIG.width}x${POD_CONFIG.height} @ ${POD_CONFIG.dpi} DPI`);
    
    // Remove data URI prefix to get raw base64
    const base64Data = imageData.includes(',') 
      ? imageData.split(',')[1] 
      : imageData;
    
    // Convert base64 to Buffer
    const inputBuffer = Buffer.from(base64Data, 'base64');
    
    // Get input image metadata
    const metadata = await sharp(inputBuffer).metadata();
    console.log(`   Input: ${metadata.width}x${metadata.height} (${metadata.format})`);
    
    // Calculate scaling to fit within POD dimensions while maintaining aspect ratio
    // We want to fit the design INSIDE the canvas, not stretch it
    const inputWidth = metadata.width || 1024;
    const inputHeight = metadata.height || 1024;
    
    // Calculate scale factor to fit design within 96% of canvas (maximize design size for POD)
    // This ensures designs appear large and prominent
    const maxDesignWidth = POD_CONFIG.width * 0.96;
    const maxDesignHeight = POD_CONFIG.height * 0.96;
    
    const scaleX = maxDesignWidth / inputWidth;
    const scaleY = maxDesignHeight / inputHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = Math.round(inputWidth * scale);
    const scaledHeight = Math.round(inputHeight * scale);
    
    console.log(`   Scaled design: ${scaledWidth}x${scaledHeight}`);
    
    // Process the image:
    // 1. Resize the design (maintaining aspect ratio)
    // 2. Extend to full POD canvas with transparent background
    // 3. Center the design
    // 4. Apply sharpening
    // 5. Set DPI metadata
    const outputBuffer = await sharp(inputBuffer)
      // First resize the design
      .resize(scaledWidth, scaledHeight, {
        kernel: 'lanczos3', // Best quality algorithm
        fit: 'inside',
        withoutEnlargement: false, // Allow upscaling
      })
      // Apply sharpening to counteract any blur from upscaling
      .sharpen({
        sigma: 1.2,
        m1: 1.0,
        m2: 0.5,
      })
      // Extend to full POD canvas size with transparent background
      // This centers the design
      .extend({
        top: Math.round((POD_CONFIG.height - scaledHeight) / 2),
        bottom: Math.ceil((POD_CONFIG.height - scaledHeight) / 2),
        left: Math.round((POD_CONFIG.width - scaledWidth) / 2),
        right: Math.ceil((POD_CONFIG.width - scaledWidth) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent
      })
      // Convert to PNG with transparency and set DPI
      .png({
        compressionLevel: 6,
        adaptiveFiltering: true,
      })
      // Set DPI metadata (300 DPI = 300 pixels per inch)
      // Sharp uses pixels per meter, so convert: 300 DPI * 39.3701 = 11811 ppm
      .withMetadata({
        density: POD_CONFIG.dpi,
      })
      .toBuffer();
    
    // Verify output dimensions
    const outputMetadata = await sharp(outputBuffer).metadata();
    console.log(`   Output: ${outputMetadata.width}x${outputMetadata.height} @ ${outputMetadata.density || POD_CONFIG.dpi} DPI`);
    console.log(`   Size: ${(outputBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log('✅ Image normalized to POD specifications');
    
    // Return as data URI
    return `data:image/png;base64,${outputBuffer.toString('base64')}`;
    
  } catch (error) {
    console.error('❌ Error normalizing image:', error);
    throw new Error(
      `Failed to normalize image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get image dimensions from base64 data
 */
export async function getImageDimensions(imageData: string): Promise<{ width: number; height: number }> {
  const base64Data = imageData.includes(',') 
    ? imageData.split(',')[1] 
    : imageData;
  
  const buffer = Buffer.from(base64Data, 'base64');
  const metadata = await sharp(buffer).metadata();
  
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

/**
 * Luminosity Invert - Inverts the lightness of pixels while preserving hue
 * 
 * This transforms dark elements to light (and vice versa) while preserving
 * color relationships. Useful for adapting designs between light and dark products.
 * 
 * Algorithm:
 * 1. Convert RGB to HSL
 * 2. Invert the L (lightness) value: L' = 1 - L
 * 3. Convert back to RGB
 * 4. Preserve original alpha
 * 
 * @param imageData - Base64 encoded image with data URI prefix
 * @returns Base64 encoded PNG with inverted luminosity
 */
export async function luminosityInvert(imageData: string): Promise<string> {
  try {
    console.log('🔄 Performing luminosity invert...');
    
    // Remove data URI prefix to get raw base64
    const base64Data = imageData.includes(',') 
      ? imageData.split(',')[1] 
      : imageData;
    
    // Convert base64 to Buffer
    const inputBuffer = Buffer.from(base64Data, 'base64');
    
    // Get image metadata
    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    
    console.log(`   Processing ${width}x${height} image...`);
    
    // Extract raw pixel data (RGBA)
    const { data, info } = await sharp(inputBuffer)
      .ensureAlpha() // Make sure we have RGBA
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Create output buffer
    const outputData = Buffer.alloc(data.length);
    
    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const a = data[i + 3]; // Keep alpha as-is
      
      // Convert RGB to HSL
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      let l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b - r) / d + 2) / 6;
            break;
          case b:
            h = ((r - g) / d + 4) / 6;
            break;
        }
      }
      
      // INVERT the lightness
      l = 1 - l;
      
      // Convert HSL back to RGB
      let newR: number, newG: number, newB: number;
      
      if (s === 0) {
        newR = newG = newB = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number): number => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        newR = hue2rgb(p, q, h + 1/3);
        newG = hue2rgb(p, q, h);
        newB = hue2rgb(p, q, h - 1/3);
      }
      
      // Write to output buffer
      outputData[i] = Math.round(newR * 255);
      outputData[i + 1] = Math.round(newG * 255);
      outputData[i + 2] = Math.round(newB * 255);
      outputData[i + 3] = a; // Preserve alpha
    }
    
    // Convert back to PNG
    const outputBuffer = await sharp(outputData, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    })
      .png({
        compressionLevel: 6,
        adaptiveFiltering: true,
      })
      .toBuffer();
    
    console.log('✅ Luminosity invert complete');
    
    // Return as data URI
    return `data:image/png;base64,${outputBuffer.toString('base64')}`;
    
  } catch (error) {
    console.error('❌ Error inverting luminosity:', error);
    throw new Error(
      `Failed to invert luminosity: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
