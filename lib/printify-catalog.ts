/**
 * Printify Product Catalog Service
 * Organizes products into categories and provides filtering
 */

import { PrintifyBlueprint } from './printify';

// Product categories with subcategories
export const PRODUCT_CATEGORIES = {
  apparel: {
    name: 'Apparel',
    icon: '👕',
    subcategories: ['T-Shirts', 'Hoodies', 'Sweatshirts', 'Tank Tops', 'Long Sleeves', 'Dresses', 'Shorts']
  },
  homeAndLiving: {
    name: 'Home & Living',
    icon: '🏠',
    subcategories: ['Canvas', 'Posters', 'Mugs', 'Pillows', 'Blankets', 'Towels', 'Coasters']
  },
  accessories: {
    name: 'Accessories',
    icon: '👜',
    subcategories: ['Tote Bags', 'Backpacks', 'Phone Cases', 'Hats', 'Socks', 'Face Masks']
  },
  stickers: {
    name: 'Stickers & Paper',
    icon: '🏷️',
    subcategories: ['Stickers', 'Postcards', 'Greeting Cards', 'Notebooks', 'Magnets']
  }
} as const;

export type CategoryKey = keyof typeof PRODUCT_CATEGORIES;

// Fits/types for apparel
export const FITS = ['Unisex', "Men's", "Women's", 'Kids', 'Youth'] as const;
export type FitType = typeof FITS[number];

// Popular/featured blueprints (Printify blueprint IDs)
export const FEATURED_BLUEPRINTS = {
  // T-Shirts
  bellaCanvas3001: 145, // Bella+Canvas 3001 Unisex Staple T-Shirt
  gildanSoftstyle: 6, // Gildan Softstyle
  nextLevel3600: 171, // Next Level 3600
  
  // Hoodies & Sweatshirts
  gildanHoodie: 77, // Gildan Heavy Blend Hoodie
  bellaCrewneck: 380, // Bella+Canvas Sponge Fleece Crewneck
  
  // Home
  canvas: 1, // Stretched Canvas
  poster: 16, // Enhanced Matte Poster
  mug: 468, // Glossy Mug
  throwPillow: 83, // Polyester Square Pillow
  
  // Accessories
  toteBag: 171, // Cotton Tote
  phoneCase: 229, // iPhone Case
  
  // Stickers
  diecut: 551, // Die-Cut Stickers
  kissCut: 552, // Kiss-Cut Stickers
} as const;

export interface CatalogProduct {
  id: number;
  title: string;
  description: string;
  brand: string;
  model: string;
  images: string[];
  category: CategoryKey;
  subcategory: string;
  fit?: FitType;
  isFeatured: boolean;
  basePrice?: number;
}

// Keywords to detect categories
const CATEGORY_KEYWORDS: Record<CategoryKey, string[]> = {
  apparel: ['shirt', 't-shirt', 'tee', 'hoodie', 'sweatshirt', 'tank', 'dress', 'shorts', 'jersey', 'polo', 'sleeve'],
  homeAndLiving: ['canvas', 'poster', 'mug', 'pillow', 'blanket', 'towel', 'coaster', 'wall art', 'print', 'tapestry'],
  accessories: ['bag', 'tote', 'backpack', 'case', 'hat', 'cap', 'sock', 'mask', 'beanie', 'scarf'],
  stickers: ['sticker', 'postcard', 'card', 'notebook', 'magnet', 'decal']
};

// Keywords to detect subcategories
const SUBCATEGORY_KEYWORDS: Record<string, string[]> = {
  'T-Shirts': ['t-shirt', 'tee', 'unisex tee'],
  'Hoodies': ['hoodie', 'pullover hoodie', 'zip hoodie'],
  'Sweatshirts': ['sweatshirt', 'crewneck', 'fleece'],
  'Tank Tops': ['tank', 'tank top', 'muscle'],
  'Long Sleeves': ['long sleeve', 'longsleeve'],
  'Dresses': ['dress'],
  'Shorts': ['shorts'],
  'Canvas': ['canvas', 'stretched canvas'],
  'Posters': ['poster', 'art print'],
  'Mugs': ['mug', 'cup'],
  'Pillows': ['pillow', 'cushion'],
  'Blankets': ['blanket', 'throw'],
  'Towels': ['towel'],
  'Coasters': ['coaster'],
  'Tote Bags': ['tote', 'tote bag'],
  'Backpacks': ['backpack'],
  'Phone Cases': ['phone case', 'iphone', 'samsung'],
  'Hats': ['hat', 'cap', 'beanie'],
  'Socks': ['sock', 'socks'],
  'Face Masks': ['mask', 'face mask'],
  'Stickers': ['sticker'],
  'Postcards': ['postcard'],
  'Greeting Cards': ['greeting card', 'card'],
  'Notebooks': ['notebook', 'journal'],
  'Magnets': ['magnet']
};

// Keywords to detect fit type
const FIT_KEYWORDS: Record<FitType, string[]> = {
  'Unisex': ['unisex'],
  "Men's": ["men's", 'mens', 'male'],
  "Women's": ["women's", 'womens', 'female', 'ladies'],
  'Kids': ['kids', "kid's", 'children'],
  'Youth': ['youth', 'teen']
};

/**
 * Detect category from blueprint title/description
 */
function detectCategory(blueprint: PrintifyBlueprint): CategoryKey {
  const searchText = `${blueprint.title} ${blueprint.description}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return category as CategoryKey;
      }
    }
  }
  
  return 'apparel'; // Default to apparel
}

/**
 * Detect subcategory from blueprint title/description
 */
function detectSubcategory(blueprint: PrintifyBlueprint, category: CategoryKey): string {
  const searchText = `${blueprint.title} ${blueprint.description}`.toLowerCase();
  const categorySubcats = PRODUCT_CATEGORIES[category].subcategories;
  
  for (const subcategory of categorySubcats) {
    const keywords = SUBCATEGORY_KEYWORDS[subcategory] || [subcategory.toLowerCase()];
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return subcategory;
      }
    }
  }
  
  return categorySubcats[0]; // Default to first subcategory
}

/**
 * Detect fit type from blueprint title/description
 */
function detectFit(blueprint: PrintifyBlueprint): FitType | undefined {
  const searchText = `${blueprint.title}`.toLowerCase();
  
  for (const [fit, keywords] of Object.entries(FIT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        return fit as FitType;
      }
    }
  }
  
  // Default to Unisex for apparel without explicit fit
  return 'Unisex';
}

/**
 * Check if blueprint is in featured list
 */
function isFeatured(blueprintId: number): boolean {
  return Object.values(FEATURED_BLUEPRINTS).includes(blueprintId as typeof FEATURED_BLUEPRINTS[keyof typeof FEATURED_BLUEPRINTS]);
}

/**
 * Transform Printify blueprints into catalog products
 */
export function transformToCatalog(blueprints: PrintifyBlueprint[]): CatalogProduct[] {
  return blueprints.map(blueprint => {
    const category = detectCategory(blueprint);
    const subcategory = detectSubcategory(blueprint, category);
    const fit = category === 'apparel' ? detectFit(blueprint) : undefined;
    
    return {
      id: blueprint.id,
      title: blueprint.title,
      description: blueprint.description,
      brand: blueprint.brand,
      model: blueprint.model,
      images: blueprint.images,
      category,
      subcategory,
      fit,
      isFeatured: isFeatured(blueprint.id),
    };
  });
}

/**
 * Filter catalog products
 */
export function filterCatalog(
  products: CatalogProduct[],
  filters: {
    category?: CategoryKey | 'all';
    subcategory?: string;
    fit?: FitType;
    search?: string;
    featuredOnly?: boolean;
  }
): CatalogProduct[] {
  return products.filter(product => {
    // Category filter
    if (filters.category && filters.category !== 'all' && product.category !== filters.category) {
      return false;
    }
    
    // Subcategory filter
    if (filters.subcategory && product.subcategory !== filters.subcategory) {
      return false;
    }
    
    // Fit filter (only for apparel)
    if (filters.fit && product.fit !== filters.fit) {
      return false;
    }
    
    // Featured filter
    if (filters.featuredOnly && !product.isFeatured) {
      return false;
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchText = `${product.title} ${product.brand} ${product.model} ${product.description}`.toLowerCase();
      if (!searchText.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Group products by category
 */
export function groupByCategory(products: CatalogProduct[]): Record<CategoryKey, CatalogProduct[]> {
  const groups: Record<CategoryKey, CatalogProduct[]> = {
    apparel: [],
    homeAndLiving: [],
    accessories: [],
    stickers: [],
  };
  
  for (const product of products) {
    groups[product.category].push(product);
  }
  
  return groups;
}

/**
 * Group products by subcategory within a category
 */
export function groupBySubcategory(products: CatalogProduct[]): Record<string, CatalogProduct[]> {
  const groups: Record<string, CatalogProduct[]> = {};
  
  for (const product of products) {
    if (!groups[product.subcategory]) {
      groups[product.subcategory] = [];
    }
    groups[product.subcategory].push(product);
  }
  
  return groups;
}

/**
 * Sort products by various criteria
 */
export function sortCatalog(
  products: CatalogProduct[],
  sortBy: 'featured' | 'name' | 'price'
): CatalogProduct[] {
  return [...products].sort((a, b) => {
    switch (sortBy) {
      case 'featured':
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return a.title.localeCompare(b.title);
      case 'name':
        return a.title.localeCompare(b.title);
      case 'price':
        return (a.basePrice || 0) - (b.basePrice || 0);
      default:
        return 0;
    }
  });
}

/**
 * Get category display info
 */
export function getCategoryInfo(categoryKey: CategoryKey) {
  return PRODUCT_CATEGORIES[categoryKey];
}

/**
 * Get all category keys
 */
export function getCategoryKeys(): CategoryKey[] {
  return Object.keys(PRODUCT_CATEGORIES) as CategoryKey[];
}

