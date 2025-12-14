"use client";

import Image from "next/image";

// 4 distinct background colors - T-shirt simulation (POD product colors)
const variantBackgrounds = {
  dark: ['bg-black', 'bg-gray-800', 'bg-slate-700', 'bg-zinc-800'],
  light: ['bg-white', 'bg-gray-100', 'bg-neutral-100', 'bg-stone-50'],
};

// Dot pattern styles for canvas texture effect
const getDotPatternStyle = (isDark: boolean): React.CSSProperties => ({
  backgroundImage: `radial-gradient(circle, ${
    isDark 
      ? 'rgba(255, 255, 255, 0.15)' // Light dots on dark bg
      : 'rgba(0, 0, 0, 0.08)'        // Dark dots on light bg
  } 1px, transparent 1px)`,
  backgroundSize: '12px 12px',
});

interface VariantCardProps {
  variant: {
    id: string;
    variant_number: number;
    batch_number?: number;
    strategy: string;
    image_url: string;
    thumbnail_url?: string | null;
    recommended_background: 'light' | 'dark';
  };
  projectId: string;
  designName?: string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (variantId: string, selected: boolean) => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (variantId: string) => void;
  isPrintifyConnected?: boolean;
  onCreateProduct?: (variantId: string, imageUrl: string) => void;
  productCount?: number;
}

export default function VariantCard({
  variant,
  projectId,
  designName,
  isSelectionMode = false,
  isSelected = false,
  onSelectionChange,
  isFavorite = false,
  onFavoriteToggle,
  isPrintifyConnected = false,
  onCreateProduct,
  productCount,
}: VariantCardProps) {
  // Each variant gets a unique shade based on its number (1-4)
  const isDarkBg = variant.recommended_background === 'dark';
  const bgIndex = (variant.variant_number - 1) % 4;
  const bgClass = variantBackgrounds[isDarkBg ? 'dark' : 'light'][bgIndex];
  
  // Dynamic star icon color based on background (no background, just icon)
  const starColor = isDarkBg ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-800';

  const handleCardClick = () => {
    if (isSelectionMode && onSelectionChange) {
      onSelectionChange(variant.id, !isSelected);
      return;
    }
    if (onCreateProduct) {
      onCreateProduct(variant.id, variant.image_url);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectionChange) {
      onSelectionChange(variant.id, !isSelected);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavoriteToggle) {
      onFavoriteToggle(variant.id);
    }
  };

  const handleCreateProduct = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCreateProduct) {
      onCreateProduct(variant.id, variant.image_url);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        bg-surface rounded-sm overflow-hidden shadow-sm border border-border group
        transition-all duration-200
        hover:shadow-md hover:ring-1 hover:ring-accent/20 hover:-translate-y-0.5
        ${isSelectionMode ? 'cursor-pointer' : ''}
        ${isSelected ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''}
        ${isSelectionMode && !isSelected ? 'hover:ring-2 hover:ring-accent/50' : ''}
      `}
    >
      {/* Image - Compact & Clickable */}
      <div
        className={`aspect-[3/2] ${bgClass} relative overflow-hidden block cursor-pointer`}
        style={getDotPatternStyle(isDarkBg)}
        onClick={handleCardClick}
      >
        <Image
          src={variant.thumbnail_url || variant.image_url}
          alt={variant.strategy}
          fill
          loading="lazy"
          className="object-contain p-3 transition-transform duration-200 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
        
        {/* Selection Checkbox - Top Left */}
        {isSelectionMode && (
          <button
            onClick={handleCheckboxClick}
            className={`
              absolute top-2 left-2 w-5 h-5 rounded-sm
              flex items-center justify-center
              transition-all duration-200
              ${isSelected 
                ? 'bg-accent text-white' 
                : 'bg-foreground/40 text-white/60 hover:bg-foreground/60 backdrop-blur-sm'
              }
            `}
          >
            {isSelected && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}
        
        {/* Favorite Star - Top Right - No background, just icon */}
        {onFavoriteToggle && !isSelectionMode && (
          <button
            onClick={handleFavoriteClick}
            className={`
              absolute top-2 right-2 p-1
              transition-all duration-200
              ${isFavorite 
                ? 'text-orange drop-shadow-sm' 
                : starColor
              }
            `}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg 
              className="w-4 h-4 transition-transform duration-200 hover:scale-110" 
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        )}
      </div>

      {/* Card Footer - dark mode compatible */}
      <div className="px-2.5 py-2 flex items-center justify-between bg-surface">
        {/* Strategy Name and Product Count */}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-primary truncate pr-2">{variant.strategy}</h3>
          {productCount !== undefined && (
            <div className="flex items-center gap-1 text-[11px] text-muted mt-0.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
              </svg>
              <span className="truncate">
                {productCount} {productCount === 1 ? 'product' : 'products'}
              </span>
            </div>
          )}
        </div>

        {!isSelectionMode && (
          <div className="flex items-center">
            {/* Create Product Button - Primary CTA */}
            {onCreateProduct && (
              <button
                onClick={handleCreateProduct}
                className="px-3 h-7 bg-[#29b474] text-white text-xs font-semibold rounded hover:bg-[#24a066] active:scale-[0.98] transition-all duration-200 flex items-center gap-1.5"
                title="Create Product"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
