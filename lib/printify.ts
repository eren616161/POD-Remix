/**
 * Printify API Client
 * Handles all interactions with the Printify API
 */

const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

export interface PrintifyShop {
  id: number;
  title: string;
  sales_channel: string;
}

export interface PrintifyBlueprint {
  id: number;
  title: string;
  description: string;
  brand: string;
  model: string;
  images: string[];
}

export interface PrintifyPrintProvider {
  id: number;
  title: string;
  location: {
    address1: string;
    city: string;
    country: string;
    region: string;
    zip: string;
  };
}

export interface PrintifyVariant {
  id: number;
  title: string;
  options: {
    color: string;
    size: string;
  };
  placeholders: {
    position: string;
    height: number;
    width: number;
  }[];
}

export interface PrintifyBlueprintVariants {
  id: number;
  title: string;
  variants: PrintifyVariant[];
}

export interface PrintifyUploadedImage {
  id: string;
  file_name: string;
  height: number;
  width: number;
  size: number;
  mime_type: string;
  preview_url: string;
  upload_time: string;
}

export interface PrintifyProductVariant {
  id: number;
  price: number;
  is_enabled: boolean;
}

export interface PrintifyPrintArea {
  variant_ids: number[];
  placeholders: {
    position: string;
    images: {
      id: string;
      x: number;
      y: number;
      scale: number;
      angle: number;
    }[];
  }[];
}

export interface CreateProductInput {
  title: string;
  description?: string;
  blueprint_id: number;
  print_provider_id: number;
  variants: PrintifyProductVariant[];
  print_areas: PrintifyPrintArea[];
  tags?: string[];
}

export interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  blueprint_id: number;
  print_provider_id: number;
  variants: PrintifyProductVariant[];
  print_areas: PrintifyPrintArea[];
  created_at: string;
  updated_at: string;
  visible: boolean;
  is_locked: boolean;
  external?: {
    id: string;
    handle: string;
  };
}

class PrintifyClient {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${PRINTIFY_API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Printify API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: error,
        endpoint: endpoint,
      });
      throw new Error(error.message || `Printify API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all shops connected to the Printify account
   */
  async getShops(): Promise<PrintifyShop[]> {
    return this.request<PrintifyShop[]>('/shops.json');
  }

  /**
   * Get all available blueprints (product templates)
   */
  async getCatalog(): Promise<PrintifyBlueprint[]> {
    return this.request<PrintifyBlueprint[]>('/catalog/blueprints.json');
  }

  /**
   * Get a single blueprint by ID
   */
  async getBlueprint(blueprintId: number): Promise<PrintifyBlueprint> {
    return this.request<PrintifyBlueprint>(`/catalog/blueprints/${blueprintId}.json`);
  }

  /**
   * Get print providers for a specific blueprint
   */
  async getPrintProviders(blueprintId: number): Promise<PrintifyPrintProvider[]> {
    return this.request<PrintifyPrintProvider[]>(`/catalog/blueprints/${blueprintId}/print_providers.json`);
  }

  /**
   * Get variants (colors/sizes) for a blueprint and print provider
   */
  async getBlueprintVariants(
    blueprintId: number,
    printProviderId: number
  ): Promise<PrintifyBlueprintVariants> {
    return this.request<PrintifyBlueprintVariants>(
      `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`
    );
  }

  /**
   * Get shipping info for a blueprint and print provider
   */
  async getShippingInfo(blueprintId: number, printProviderId: number): Promise<unknown> {
    return this.request(
      `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/shipping.json`
    );
  }

  /**
   * Upload an image to Printify
   */
  async uploadImage(
    shopId: string,
    imageBase64: string,
    fileName: string
  ): Promise<PrintifyUploadedImage> {
    return this.request<PrintifyUploadedImage>(`/uploads/images.json`, {
      method: 'POST',
      body: JSON.stringify({
        file_name: fileName,
        contents: imageBase64,
      }),
    });
  }

  /**
   * Upload an image from URL to Printify
   */
  async uploadImageFromUrl(
    imageUrl: string,
    fileName: string
  ): Promise<PrintifyUploadedImage> {
    return this.request<PrintifyUploadedImage>(`/uploads/images.json`, {
      method: 'POST',
      body: JSON.stringify({
        file_name: fileName,
        url: imageUrl,
      }),
    });
  }

  /**
   * Create a product on Printify
   */
  async createProduct(
    shopId: string,
    product: CreateProductInput
  ): Promise<PrintifyProduct> {
    return this.request<PrintifyProduct>(`/shops/${shopId}/products.json`, {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  /**
   * Get a product by ID
   */
  async getProduct(shopId: string, productId: string): Promise<PrintifyProduct> {
    return this.request<PrintifyProduct>(`/shops/${shopId}/products/${productId}.json`);
  }

  /**
   * Get all products in a shop
   */
  async getProducts(shopId: string, page = 1, limit = 10): Promise<{ data: PrintifyProduct[]; current_page: number; last_page: number }> {
    return this.request(`/shops/${shopId}/products.json?page=${page}&limit=${limit}`);
  }

  /**
   * Publish a product to the connected store (e.g., Shopify)
   */
  async publishProduct(
    shopId: string,
    productId: string,
    publishOptions: {
      title?: boolean;
      description?: boolean;
      images?: boolean;
      variants?: boolean;
      tags?: boolean;
    } = {}
  ): Promise<void> {
    await this.request(`/shops/${shopId}/products/${productId}/publish.json`, {
      method: 'POST',
      body: JSON.stringify({
        title: publishOptions.title ?? true,
        description: publishOptions.description ?? true,
        images: publishOptions.images ?? true,
        variants: publishOptions.variants ?? true,
        tags: publishOptions.tags ?? true,
      }),
    });
  }

  /**
   * Set product to published state (after publish request)
   */
  async setPublished(
    shopId: string,
    productId: string,
    externalData: { id: string; handle: string }
  ): Promise<void> {
    await this.request(`/shops/${shopId}/products/${productId}/publishing_succeeded.json`, {
      method: 'POST',
      body: JSON.stringify({ external: externalData }),
    });
  }

  /**
   * Update a product
   */
  async updateProduct(
    shopId: string,
    productId: string,
    updates: Partial<CreateProductInput>
  ): Promise<PrintifyProduct> {
    return this.request<PrintifyProduct>(`/shops/${shopId}/products/${productId}.json`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a product
   */
  async deleteProduct(shopId: string, productId: string): Promise<void> {
    await this.request(`/shops/${shopId}/products/${productId}.json`, {
      method: 'DELETE',
    });
  }

  /**
   * Validate API token by fetching shops
   */
  async validateToken(): Promise<{ valid: boolean; shops: PrintifyShop[] }> {
    try {
      const shops = await this.getShops();
      return { valid: true, shops };
    } catch {
      return { valid: false, shops: [] };
    }
  }
}

/**
 * Create a Printify client instance
 */
export function createPrintifyClient(apiToken: string): PrintifyClient {
  return new PrintifyClient(apiToken);
}

/**
 * Get the default (first) shop from a list
 */
export function getDefaultShop(shops: PrintifyShop[]): PrintifyShop | null {
  // Prefer Shopify shops
  const shopifyShop = shops.find(s => s.sales_channel === 'shopify');
  return shopifyShop || shops[0] || null;
}

/**
 * Helper to categorize colors into light and dark
 */
export function categorizeColor(colorName: string | undefined): 'light' | 'dark' {
  if (!colorName) {
    return 'dark'; // Default to dark if no color name provided
  }
  
  const lightColors = [
    'white', 'cream', 'natural', 'sand', 'beige', 'ivory',
    'light pink', 'light blue', 'light gray', 'light grey',
    'pink', 'yellow', 'light yellow', 'peach', 'mint',
    'heather', 'ash', 'silver', 'sport grey', 'ice grey'
  ];
  
  const lowerColor = colorName.toLowerCase();
  
  for (const light of lightColors) {
    if (lowerColor.includes(light)) {
      return 'light';
    }
  }
  
  return 'dark';
}

/**
 * Group variants by color category
 */
export function groupVariantsByColorCategory(variants: PrintifyVariant[]): {
  light: PrintifyVariant[];
  dark: PrintifyVariant[];
} {
  const light: PrintifyVariant[] = [];
  const dark: PrintifyVariant[] = [];
  
  // Group by unique colors first
  const colorMap = new Map<string, PrintifyVariant[]>();
  
  for (const variant of variants) {
    const color = variant.options?.color || 'unknown';
    if (!colorMap.has(color)) {
      colorMap.set(color, []);
    }
    colorMap.get(color)!.push(variant);
  }
  
  // Categorize each color
  for (const [color, colorVariants] of colorMap) {
    const category = categorizeColor(color);
    if (category === 'light') {
      light.push(...colorVariants);
    } else {
      dark.push(...colorVariants);
    }
  }
  
  return { light, dark };
}

/**
 * Extract unique colors from variants
 */
export function getUniqueColors(variants: PrintifyVariant[]): { color: string; category: 'light' | 'dark' }[] {
  const colorSet = new Set<string>();
  const colors: { color: string; category: 'light' | 'dark' }[] = [];
  
  for (const variant of variants) {
    const color = variant.options?.color;
    if (color && !colorSet.has(color)) {
      colorSet.add(color);
      colors.push({
        color,
        category: categorizeColor(color),
      });
    }
  }
  
  return colors;
}

/**
 * Extract unique sizes from variants
 */
export function getUniqueSizes(variants: PrintifyVariant[]): string[] {
  const sizeSet = new Set<string>();
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
  
  for (const variant of variants) {
    sizeSet.add(variant.options.size);
  }
  
  return Array.from(sizeSet).sort((a, b) => {
    const aIndex = sizeOrder.indexOf(a);
    const bIndex = sizeOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

