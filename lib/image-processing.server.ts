/**
 * Image Processing Library - Server-only (Sharp)
 * This file should ONLY be imported in API routes/server components
 */

import type { PresetType } from './image-processing';

/**
 * Apply preset using server-side processing (Sharp)
 * This should ONLY be used in API routes
 */
export async function applyPresetServer(
  imageBuffer: Buffer,
  preset: PresetType
): Promise<Buffer> {
  // Dynamic import Sharp only on server
  const sharp = (await import('sharp')).default;
  
  let image = sharp(imageBuffer);
  
  switch (preset) {
    case 'original':
      // No changes
      break;
      
    case 'vibrant':
      image = image
        .modulate({
          saturation: 1.3,
        })
        .linear(1.1, 0); // Contrast
      break;
      
    case 'vintage':
      image = image
        .modulate({
          saturation: 0.9,
          brightness: 1.05,
        })
        .tint({ r: 255, g: 240, b: 220 }); // Sepia-like tint
      break;
      
    case 'invert':
      // Match client-side CSS filter: invert(1) hue-rotate(180deg)
      // Negate colors (invert) then rotate hue by 180 degrees
      image = image
        .negate({ alpha: false })
        .modulate({
          hue: 180, // Rotate hue by 180 degrees
        });
      break;
      
    case 'muted':
      image = image
        .modulate({
          saturation: 0.7,
          brightness: 1.05,
        });
      break;
      
    case 'bold':
      image = image
        .modulate({
          brightness: 1.1,
        })
        .linear(1.2, 0); // High contrast
      break;
  }
  
  return image.png().toBuffer();
}

