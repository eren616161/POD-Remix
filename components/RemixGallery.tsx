"use client";

import { useState, useRef } from "react";
import { generateDownloadFileName, downloadImage } from "@/lib/download-utils";

interface DesignVersion {
  imageData: string;
  imageUrl?: string;
  prompt: string;
}

interface ColorClassification {
  recommendedBackground: 'light' | 'dark';
  productHint: string;
}

interface Variant {
  id: number;
  strategy: string;
  design: DesignVersion;
  colorClassification?: ColorClassification;
}

interface RemixGalleryProps {
  variants: Variant[];
  onSelect?: (variant: Variant | null) => void;
  onEdit?: (variant: Variant) => void;
  onDownload?: (variant: Variant) => void | Promise<void>;
}

export default function RemixGallery({ variants, onEdit, onDownload }: RemixGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle scroll snap for mobile carousel
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.offsetWidth;
      const newIndex = Math.round(scrollLeft / cardWidth);
      setCurrentIndex(Math.min(newIndex, variants.length - 1));
    }
  };

  // Scroll to specific card on mobile
  const scrollToCard = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.offsetWidth;
      container.scrollTo({
        left: index * cardWidth,
        behavior: "smooth",
      });
    }
  };

  if (!variants || variants.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-sm shadow-card border border-border">
        <p className="text-muted">No variants available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop Grid - 4 in a row */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {variants.map((variant) => (
          <VariantCard
            key={variant.id}
            variant={variant}
            onEdit={onEdit}
            onDownload={onDownload}
          />
        ))}
      </div>

      {/* Mobile Carousel */}
      <div className="md:hidden">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {variants.map((variant) => (
            <div
              key={variant.id}
              className="flex-shrink-0 w-full snap-center px-2"
            >
              <VariantCard
                variant={variant}
                onEdit={onEdit}
                onDownload={onDownload}
              />
            </div>
          ))}
        </div>

        {/* Mobile Carousel Indicators */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => scrollToCard(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="p-2 rounded-sm bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Previous variant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex gap-2">
            {variants.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToCard(index)}
                className={`
                  transition-all duration-300
                  ${index === currentIndex
                    ? "w-6 h-2 bg-primary rounded-sm"
                    : "w-2 h-2 bg-muted/40 rounded-sm hover:bg-muted/60"
                  }
                `}
                aria-label={`Go to variant ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => scrollToCard(Math.min(variants.length - 1, currentIndex + 1))}
            disabled={currentIndex === variants.length - 1}
            className="p-2 rounded-sm bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Next variant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Mobile position indicator */}
        <p className="text-center text-sm text-muted mt-2">
          {currentIndex + 1} of {variants.length}
        </p>
      </div>
    </div>
  );
}

// Export types for use in other components
export type { Variant, ColorClassification, DesignVersion };

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
  variant: Variant;
  onEdit?: (variant: Variant) => void;
  onDownload?: (variant: Variant) => void | Promise<void>;
}

function VariantCard({ variant, onEdit, onDownload }: VariantCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const recommendedBg = variant.colorClassification?.recommendedBackground ?? "light";
  const isDarkBg = recommendedBg === "dark";
  
  // Each variant gets a unique shade based on its ID (1-4)
  const bgIndex = (variant.id - 1) % 4;
  const bgClass = variantBackgrounds[isDarkBg ? 'dark' : 'light'][bgIndex];

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      if (onDownload) {
        await onDownload(variant);
      } else {
        // Default download behavior using standardized naming
        const imageUrl = variant.design.imageUrl || variant.design.imageData;
        const filename = generateDownloadFileName({
          designName: 'POD_Remix',
          batchNumber: 1,
          variantNumber: variant.id,
          strategy: variant.strategy,
          style: 'Original'
        });
        
        await downloadImage(imageUrl, filename);
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCardClick = () => {
    if (onEdit) {
      onEdit(variant);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white dark:bg-gray-800 rounded-sm overflow-hidden shadow-sm border border-border group transition-all duration-200 hover:shadow-md hover:ring-1 hover:ring-accent/20 hover:-translate-y-0.5 cursor-pointer"
    >
      {/* Image - Square - Clickable */}
      <div 
        className={`aspect-square ${bgClass} relative overflow-hidden`}
        style={getDotPatternStyle(isDarkBg)}
      >
        <img
          src={variant.design.imageUrl || variant.design.imageData}
          alt={`Variant ${variant.id}: ${variant.strategy}`}
          className="w-full h-full object-contain p-6 transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.preventDefault();
            e.currentTarget.onerror = null;
          }}
        />
      </div>

      {/* Card Footer - Matching VariantCard layout */}
      <div className="px-3 py-2 flex items-center justify-between bg-white dark:bg-gray-800">
        {/* Strategy Name as Title */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate pr-2">{variant.strategy}</h3>
        
        <div className="flex items-center gap-1.5">
          {/* Download Button - ghost style */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-7 h-7 rounded-sm border border-border hover:border-accent/30 hover:bg-accent/5 flex items-center justify-center transition-all duration-200 disabled:opacity-50"
            title="Download"
          >
            {isDownloading ? (
              <svg className="w-3.5 h-3.5 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
          
          {/* Edit Button - Primary accent style */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit(variant);
            }}
            className="px-3 h-7 bg-accent text-white text-xs font-medium rounded-sm shadow-cyan-glow hover:shadow-cyan-glow-hover hover:bg-accent/90 active:scale-[0.98] transition-all duration-200 flex items-center"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
