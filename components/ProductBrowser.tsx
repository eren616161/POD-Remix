"use client";

import { useState } from "react";
import Image from "next/image";
import { CatalogProduct } from "@/lib/printify-catalog";

// Featured products with exact Printify Blueprint IDs
const FEATURED_PRODUCTS = [
  {
    id: 'tshirt',
    blueprintId: 12,
    name: 'Bella Canvas 3001',
    category: 'T-Shirts',
    description: 'Premium unisex cotton tee - bestselling quality',
    startingPrice: '$8.50',
    icon: '👕',
    isBestseller: true,
    keywords: ['bella', '3001', 'unisex jersey'],
  },
  {
    id: 'sweatshirt',
    blueprintId: 49,
    name: 'Gildan 18000',
    category: 'Sweatshirts',
    description: 'Heavy blend crewneck sweatshirt',
    startingPrice: '$14.50',
    icon: '🎽',
    isBestseller: false,
    keywords: ['gildan', '18000', 'crewneck', 'heavy blend'],
  },
  {
    id: 'hoodie',
    blueprintId: 77,
    name: 'Gildan 18500',
    category: 'Hoodies',
    description: 'Heavy blend hooded sweatshirt',
    startingPrice: '$18.50',
    icon: '🧥',
    isBestseller: true,
    keywords: ['gildan', '18500', 'hoodie', 'hooded'],
  },
  {
    id: 'canvas',
    blueprintId: 1159,
    name: 'Matte Canvas',
    category: 'Wall Art',
    description: 'Stretched canvas with 1.25" depth',
    startingPrice: '$12.00',
    icon: '🖼️',
    isBestseller: false,
    keywords: ['canvas', 'matte', 'stretched', '1.25'],
  },
];

interface ProductBrowserProps {
  catalog: CatalogProduct[];
  onSelectProducts: (products: CatalogProduct[]) => void;
  selectedProducts?: CatalogProduct[];
}

export default function ProductBrowser({
  catalog,
  onSelectProducts,
  selectedProducts = [],
}: ProductBrowserProps) {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  // Find catalog product by blueprint ID or keywords
  const findCatalogProduct = (featuredProduct: typeof FEATURED_PRODUCTS[0]) => {
    // First try to find by blueprint ID
    const byId = catalog.find(p => p.id === featuredProduct.blueprintId);
    if (byId) return byId;
    
    // Fallback to keyword matching
    return catalog.find(product => {
      const searchText = `${product.title} ${product.subcategory}`.toLowerCase();
      return featuredProduct.keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    });
  };

  // Check if product is selected
  const isProductSelected = (productId: number) => {
    return selectedProducts.some(p => p.id === productId);
  };

  // Toggle product selection
  const toggleProduct = (catalogProduct: CatalogProduct | undefined) => {
    if (!catalogProduct) return;
    
    if (isProductSelected(catalogProduct.id)) {
      onSelectProducts(selectedProducts.filter(p => p.id !== catalogProduct.id));
    } else {
      onSelectProducts([...selectedProducts, catalogProduct]);
    }
  };

  // Get matched catalog products for all featured items
  const getProductMatches = () => {
    return FEATURED_PRODUCTS.map(featured => ({
      featured,
      catalog: findCatalogProduct(featured),
    }));
  };

  const productMatches = getProductMatches();

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-foreground mb-2">Choose Your Products</h3>
        <p className="text-sm text-muted">Select one or more product types to create with your design</p>
      </div>

      {/* Selected count badge */}
      {selectedProducts.length > 0 && (
        <div className="flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-accent/10 via-accent/5 to-accent/10 border border-accent/20 rounded-xl">
          <div className="flex -space-x-2">
            {selectedProducts.slice(0, 4).map((product, i) => (
              <div 
                key={product.id} 
                className="w-9 h-9 rounded-full bg-white border-2 border-accent overflow-hidden shadow-sm"
                style={{ zIndex: 4 - i }}
              >
                {product.images[0] ? (
                  <Image src={product.images[0]} alt="" width={36} height={36} className="object-contain" />
                ) : (
                  <span className="text-sm flex items-center justify-center h-full">👕</span>
                )}
              </div>
            ))}
          </div>
          <span className="text-sm font-semibold text-accent">
            {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => onSelectProducts([])}
            className="ml-2 text-xs text-muted hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Product Cards Grid - Horizontal Layout */}
      <div className="grid grid-cols-2 gap-6">
        {productMatches.map(({ featured, catalog: catalogProduct }) => {
          const isAvailable = !!catalogProduct;
          const isSelected = catalogProduct && isProductSelected(catalogProduct.id);
          const isHovered = hoveredProduct === featured.id;

          return (
            <button
              key={featured.id}
              onClick={() => toggleProduct(catalogProduct)}
              onMouseEnter={() => setHoveredProduct(featured.id)}
              onMouseLeave={() => setHoveredProduct(null)}
              disabled={!isAvailable}
              className={`
                relative group flex text-left rounded-lg border overflow-hidden transition-all duration-200
                ${isSelected 
                  ? 'border-accent bg-accent/5 shadow-md' 
                  : isAvailable
                    ? 'border-border hover:border-accent/40 bg-surface hover:shadow-sm'
                    : 'border-border/50 bg-secondary/30 cursor-not-allowed opacity-60'
                }
              `}
            >
              {/* Product Image - Left Side */}
              <div className={`
                relative w-48 h-48 flex-shrink-0 flex items-center justify-center
                ${featured.id === 'canvas' ? 'bg-gray-100' : 'bg-white'}
              `}>
                {/* Bestseller Badge */}
                {featured.isBestseller && (
                  <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-orange text-white text-[10px] font-bold uppercase tracking-wide rounded-full">
                    Best
                  </div>
                )}
                
                {catalogProduct?.images[0] ? (
                  <Image
                    src={catalogProduct.images[0]}
                    alt={featured.name}
                    width={192}
                    height={192}
                    className={`object-contain transition-transform duration-200 ${isHovered ? 'scale-105' : ''}`}
                  />
                ) : (
                  <span className="text-6xl opacity-70 transition-transform duration-200"
                    style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}>
                    {featured.icon}
                  </span>
                )}
              </div>

              {/* Product Info - Right Side */}
              <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-foreground text-sm leading-tight truncate">{featured.name}</h4>
                      <p className="text-xs text-muted mt-0.5">{featured.category}</p>
                    </div>
                    {/* Selection Indicator */}
                    <div className={`
                      w-6 h-6 rounded-full border flex items-center justify-center transition-all flex-shrink-0
                      ${isSelected 
                        ? 'bg-accent border-accent text-white' 
                        : 'bg-white/80 border-border group-hover:border-accent/50'
                      }
                    `}>
                      {isSelected && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted/80 leading-relaxed mt-2 line-clamp-3">{featured.description}</p>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-bold text-accent">{featured.startingPrice}</span>
                  <span className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-muted'}`}>
                    {isSelected ? '✓ Selected' : 'Select'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pro Tip */}
      <div className="text-center py-2">
        <p className="text-xs text-muted">
          💡 <span className="font-medium">Pro tip:</span> Select multiple products to create them all with the same design in one go
        </p>
      </div>
    </div>
  );
}
