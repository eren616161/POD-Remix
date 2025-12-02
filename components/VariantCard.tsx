"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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
    strategy: string;
    image_url: string;
    recommended_background: 'light' | 'dark';
    product_hint: string | null;
  };
  projectId: string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (variantId: string, selected: boolean) => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (variantId: string) => void;
}

export default function VariantCard({
  variant,
  projectId,
  isSelectionMode = false,
  isSelected = false,
  onSelectionChange,
  isFavorite = false,
  onFavoriteToggle,
}: VariantCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Each variant gets a unique shade based on its number (1-4)
  const isDarkBg = variant.recommended_background === 'dark';
  const bgIndex = (variant.variant_number - 1) % 4;
  const bgClass = variantBackgrounds[isDarkBg ? 'dark' : 'light'][bgIndex];
  
  // Dynamic star icon color based on background (no background, just icon)
  const starColor = isDarkBg ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-800';

  // Download variant image
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(variant.image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `variant-${variant.variant_number}-${variant.strategy.toLowerCase().replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCardClick = () => {
    if (isSelectionMode && onSelectionChange) {
      onSelectionChange(variant.id, !isSelected);
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

  return (
    <div
      onClick={handleCardClick}
      className={`
        bg-white rounded-sm overflow-hidden shadow-sm border border-border group
        transition-all duration-200
        hover:shadow-md hover:ring-1 hover:ring-accent/20 hover:-translate-y-0.5
        ${isSelectionMode ? 'cursor-pointer' : ''}
        ${isSelected ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''}
        ${isSelectionMode && !isSelected ? 'hover:ring-2 hover:ring-accent/50' : ''}
      `}
    >
      {/* Image - Compact & Clickable */}
      <Link
        href={`/designs/${projectId}/edit/${variant.id}`}
        className={`aspect-[3/2] ${bgClass} relative overflow-hidden block cursor-pointer`}
        style={getDotPatternStyle(isDarkBg)}
        onClick={(e) => isSelectionMode && e.preventDefault()}
      >
        <Image
          src={variant.image_url}
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
      </Link>

      {/* Card Footer */}
      <div className="px-2.5 py-2 flex items-center justify-between bg-white">
        {/* Strategy Name as Title */}
        <h3 className="text-sm font-semibold text-foreground truncate pr-2">{variant.strategy}</h3>
        
        {!isSelectionMode && (
          <div className="flex items-center gap-0.5">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-7 h-7 rounded text-muted hover:text-accent hover:bg-accent/5 flex items-center justify-center transition-all duration-200 disabled:opacity-50"
              title="Download"
            >
              {isDownloading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>
            
            {/* Edit Button */}
            <Link
              href={`/designs/${projectId}/edit/${variant.id}`}
              className="px-2 h-7 text-accent hover:text-accent/80 text-sm font-semibold rounded hover:bg-accent/5 active:scale-[0.98] transition-all duration-200 flex items-center"
            >
              Edit
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
