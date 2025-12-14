// ============================================================================
// POD Product Configuration
// Multi-product support for print-on-demand exports
// Printify Blueprint IDs and specifications
// ============================================================================

export type ProductId = 'tshirt' | 'sweatshirt' | 'hoodie' | 'canvas';

export interface PrintZone {
  // Position as percentage from top-left of mockup
  topPercent: number;
  leftPercent: number;
  // Size as percentage of mockup dimensions
  widthPercent: number;
  heightPercent: number;
}

// Precise print zone specification with center coordinates
export interface PrintZoneSpec {
  widthInches: number;
  heightInches: number;
  center: {
    x: number; // X coordinate in pixels (from top-left origin)
    y: number; // Y coordinate in pixels (from top-left origin)
  };
}

// Collection of print zones for a product
export interface PrintZones {
  largeCenterChest?: PrintZoneSpec;
  leftChest?: PrintZoneSpec;
  fullBack?: PrintZoneSpec;
  // Add other zones as needed
}

export interface ProductMockup {
  light: string;
  dark: string;
}

export interface ProductConfig {
  id: ProductId;
  name: string;
  shortName: string;
  // Printify Blueprint ID
  blueprintId: number;
  // Model name for display
  modelName: string;
  // Export dimensions in pixels (at 300 DPI)
  exportWidth: number;
  exportHeight: number;
  // Print area in inches (for reference)
  printAreaInches: { width: number; height: number };
  // Standard DPI for print
  dpi: number;
  // Mockup image paths
  mockups: ProductMockup;
  // Print zone on mockup (where design appears) - percentage-based for UI
  printZone: PrintZone;
  // Precise print zones with pixel coordinates (from Printify templates)
  printZones?: PrintZones;
  // Default scale for this product (percentage)
  defaultScale: number;
  // Base cost range
  baseCost: { min: number; max: number };
  // Available color categories
  colorCategories: ('light' | 'dark' | 'neutral')[];
}

// ============================================================================
// Product Definitions
// Based on Printify Blueprint specifications
// ============================================================================

export const PRODUCTS: Record<ProductId, ProductConfig> = {
  tshirt: {
    id: 'tshirt',
    name: 'T-Shirt',
    shortName: 'Tee',
    blueprintId: 12, // Bella Canvas 3001
    modelName: 'Bella Canvas 3001',
    exportWidth: 4500,
    exportHeight: 5400,
    printAreaInches: { width: 15, height: 18 },
    dpi: 300,
    mockups: {
      light: '/mockups/tshirt-white.png',
      dark: '/mockups/tshirt-black.png',
    },
    printZone: {
      topPercent: 22,
      leftPercent: 25,
      widthPercent: 50,
      heightPercent: 45,
    },
    defaultScale: 100,
    baseCost: { min: 8.50, max: 12.00 },
    colorCategories: ['light', 'dark', 'neutral'],
  },
  sweatshirt: {
    id: 'sweatshirt',
    name: 'Sweatshirt',
    shortName: 'Sweat',
    blueprintId: 49, // Gildan 18000
    modelName: 'Gildan 18000',
    exportWidth: 4200,    // Overall template width (pixels)
    exportHeight: 4800,   // Overall template height (pixels)
    printAreaInches: { width: 14, height: 16 }, // Max print area in inches
    dpi: 300,
    mockups: {
      light: '/mockups/sweatshirt-white.png',
      dark: '/mockups/sweatshirt-black.png',
    },
    printZone: {
      topPercent: 20,
      leftPercent: 22,
      widthPercent: 56,
      heightPercent: 48,
    },
    // Precise print zones from Printify template (Gildan 18000)
    // Actual max print area: 3852 x 4398 px (not full canvas)
    printZones: {
      largeCenterChest: {
        widthInches: 12.84,   // 3852 px / 300 dpi
        heightInches: 14.66,  // 4398 px / 300 dpi
        center: {
          x: 2100,  // Horizontal center: 4200 / 2
          y: 2400,  // Vertical center: 4800 / 2 (print box centered on template)
        },
      },
    },
    defaultScale: 100,
    baseCost: { min: 14.50, max: 20.00 },
    colorCategories: ['light', 'dark', 'neutral'],
  },
  hoodie: {
    id: 'hoodie',
    name: 'Hoodie',
    shortName: 'Hood',
    blueprintId: 77, // Gildan 18500
    modelName: 'Gildan 18500',
    exportWidth: 4200,
    exportHeight: 4800,
    printAreaInches: { width: 14, height: 16 },
    dpi: 300,
    mockups: {
      light: '/mockups/hoodie-white.png',
      dark: '/mockups/hoodie-black.png',
    },
    printZone: {
      topPercent: 28,
      leftPercent: 22,
      widthPercent: 56,
      heightPercent: 40,
    },
    defaultScale: 100,
    baseCost: { min: 18.50, max: 26.00 },
    colorCategories: ['light', 'dark', 'neutral'],
  },
  canvas: {
    id: 'canvas',
    name: 'Canvas',
    shortName: 'Canvas',
    blueprintId: 1159, // Matte Canvas, Stretched, 1.25"
    modelName: 'Matte Canvas 1.25"',
    exportWidth: 4800,
    exportHeight: 4800,
    printAreaInches: { width: 16, height: 16 },
    dpi: 300,
    mockups: {
      light: '/mockups/canvas-white.png',
      dark: '/mockups/canvas-black.png',
    },
    printZone: {
      topPercent: 10,
      leftPercent: 10,
      widthPercent: 80,
      heightPercent: 80,
    },
    defaultScale: 100,
    baseCost: { min: 12.00, max: 45.00 },
    colorCategories: ['neutral'],
  },
};

// Blueprint ID to ProductId mapping for quick lookups
export const BLUEPRINT_TO_PRODUCT: Record<number, ProductId> = {
  12: 'tshirt',
  49: 'sweatshirt',
  77: 'hoodie',
  1159: 'canvas',
};

// Product order for UI tabs
export const PRODUCT_ORDER: ProductId[] = ['tshirt', 'sweatshirt', 'hoodie', 'canvas'];

// ============================================================================
// Product Color Configuration
// Specifies which colors to show for each product type
// Colors are matched case-insensitively against Printify variant color names
// ============================================================================

export const PRODUCT_COLORS: Record<ProductId, string[]> = {
  // Bella Canvas 3001 Colors
  tshirt: [
    'White',
    'Black',
    'Dark Grey Heather',
    'Athletic Heather',
    'Navy',
    'Red',
    'True Royal',
    'Forest',
  ],
  // Gildan 18000 Colors
  sweatshirt: [
    'Black',
    'White',
    'Navy',
    'Sport Gray',
    'Light Pink',
    'Red',
  ],
  // Gildan 18500 Colors
  hoodie: [
    'Black',
    'White',
    'Navy',
    'Sport Gray',
    'Light Pink',
    'Red',
  ],
  // Canvas - no color restriction (uses all available)
  canvas: [],
};

/**
 * Check if a color is allowed for a product
 * If the product has no color restrictions (empty array), all colors are allowed
 */
export function isColorAllowedForProduct(
  productId: ProductId,
  colorName: string
): boolean {
  const allowedColors = PRODUCT_COLORS[productId];
  
  // If no restrictions, allow all colors
  if (!allowedColors || allowedColors.length === 0) {
    return true;
  }
  
  // Case-insensitive matching
  const normalizedColor = colorName.toLowerCase().trim();
  return allowedColors.some(
    allowed => allowed.toLowerCase().trim() === normalizedColor
  );
}

/**
 * Get the allowed colors for a product
 */
export function getAllowedColorsForProduct(productId: ProductId): string[] {
  return PRODUCT_COLORS[productId] || [];
}

// Get all products as array
export const getAllProducts = (): ProductConfig[] => 
  PRODUCT_ORDER.map(id => PRODUCTS[id]);

// Get product by ID with fallback to t-shirt
export const getProduct = (id: ProductId): ProductConfig => 
  PRODUCTS[id] || PRODUCTS.tshirt;

// Get product by Blueprint ID
export const getProductByBlueprintId = (blueprintId: number): ProductConfig | null => {
  const productId = BLUEPRINT_TO_PRODUCT[blueprintId];
  return productId ? PRODUCTS[productId] : null;
};

// Check if mockup exists (placeholder until user adds images)
export const getMockupUrl = (
  productId: ProductId, 
  variant: 'light' | 'dark'
): string => {
  const product = getProduct(productId);
  return product.mockups[variant];
};

// Calculate aspect ratio for a product
export const getProductAspectRatio = (productId: ProductId): number => {
  const product = getProduct(productId);
  return product.exportWidth / product.exportHeight;
};

// Per-product settings type
export interface ProductSettings {
  scale: number;
  position: { x: number; y: number };
}

// Default settings for a product
export const getDefaultSettings = (productId: ProductId): ProductSettings => ({
  scale: getProduct(productId).defaultScale,
  position: { x: 0, y: 0 },
});

// All products settings type (for state management)
export type AllProductSettings = Record<ProductId, ProductSettings>;

// Initialize settings for all products
export const initializeAllProductSettings = (): AllProductSettings => ({
  tshirt: getDefaultSettings('tshirt'),
  sweatshirt: getDefaultSettings('sweatshirt'),
  hoodie: getDefaultSettings('hoodie'),
  canvas: getDefaultSettings('canvas'),
});

// Get print area dimensions in pixels for a product
export const getPrintAreaPixels = (productId: ProductId): { width: number; height: number } => {
  const product = getProduct(productId);
  return {
    width: Math.round(product.printAreaInches.width * product.dpi),
    height: Math.round(product.printAreaInches.height * product.dpi),
  };
};

// Format price range for display
export const formatPriceRange = (productId: ProductId): string => {
  const product = getProduct(productId);
  if (product.baseCost.min === product.baseCost.max) {
    return `$${product.baseCost.min.toFixed(2)}`;
  }
  return `$${product.baseCost.min.toFixed(2)} - $${product.baseCost.max.toFixed(2)}`;
};
