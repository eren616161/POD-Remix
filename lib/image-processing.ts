/**
 * Image Processing Library - Client-safe exports
 * Applies style presets to images for different product backgrounds
 */

export type PresetType = 'original' | 'vibrant' | 'vintage' | 'invert' | 'muted' | 'bold';

export interface PresetInfo {
  id: PresetType;
  name: string;
  description: string;
  bestFor: 'light' | 'dark' | 'both';
  cssFilter: string;
}

export const PRESETS: Record<PresetType, PresetInfo> = {
  original: {
    id: 'original',
    name: 'Original',
    description: 'No adjustments, original design',
    bestFor: 'both',
    cssFilter: 'none',
  },
  vibrant: {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Enhanced saturation and contrast',
    bestFor: 'light',
    cssFilter: 'saturate(1.3) contrast(1.1)',
  },
  vintage: {
    id: 'vintage',
    name: 'Vintage',
    description: 'Warm, sepia-toned effect',
    bestFor: 'light',
    cssFilter: 'sepia(0.3) saturate(0.9) brightness(1.05)',
  },
  invert: {
    id: 'invert',
    name: 'Invert',
    description: 'Inverted colors for dark backgrounds',
    bestFor: 'dark',
    cssFilter: 'invert(1) hue-rotate(180deg)',
  },
  muted: {
    id: 'muted',
    name: 'Muted',
    description: 'Softer, desaturated look',
    bestFor: 'light',
    cssFilter: 'saturate(0.7) brightness(1.05)',
  },
  bold: {
    id: 'bold',
    name: 'Bold',
    description: 'High contrast for dark backgrounds',
    bestFor: 'dark',
    cssFilter: 'contrast(1.2) brightness(1.1)',
  },
};

/**
 * Get recommended presets for a color category
 */
export function getPresetsForCategory(category: 'light' | 'dark'): PresetInfo[] {
  return Object.values(PRESETS).filter(
    preset => preset.bestFor === category || preset.bestFor === 'both'
  );
}

/**
 * Get default preset for a color category
 */
export function getDefaultPreset(category: 'light' | 'dark'): PresetType {
  return category === 'light' ? 'vibrant' : 'invert';
}

/**
 * Create a visual preview URL with CSS filter (no actual processing)
 * For client-side previews only
 */
export function getPreviewStyle(preset: PresetType): React.CSSProperties {
  return {
    filter: PRESETS[preset].cssFilter,
  };
}

/**
 * Generate product mockup position info
 */
export interface MockupPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export const MOCKUP_POSITIONS: Record<string, MockupPosition> = {
  'tshirt-front': {
    x: 0.25,
    y: 0.2,
    width: 0.5,
    height: 0.5,
  },
  'hoodie-front': {
    x: 0.25,
    y: 0.25,
    width: 0.5,
    height: 0.45,
  },
  'mug-wrap': {
    x: 0.1,
    y: 0.2,
    width: 0.8,
    height: 0.6,
  },
  'canvas': {
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
  },
  'poster': {
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
  },
  'pillow': {
    x: 0.15,
    y: 0.15,
    width: 0.7,
    height: 0.7,
  },
  'tote-bag': {
    x: 0.2,
    y: 0.2,
    width: 0.6,
    height: 0.5,
  },
  'phone-case': {
    x: 0.15,
    y: 0.25,
    width: 0.7,
    height: 0.5,
  },
};

/**
 * Get mockup position for a product type
 */
export function getMockupPosition(productType: string): MockupPosition {
  const normalizedType = productType.toLowerCase().replace(/\s+/g, '-');
  
  for (const [key, position] of Object.entries(MOCKUP_POSITIONS)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return position;
    }
  }
  
  // Default to t-shirt position
  return MOCKUP_POSITIONS['tshirt-front'];
}
