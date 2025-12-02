"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

// 4 distinct background colors - T-shirt simulation (POD product colors)
// Matches VariantCard.tsx for consistent experience
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

interface Variant {
  id: string;
  variant_number?: number;
  image_url: string;
  thumbnail_url?: string | null;
  recommended_background: 'light' | 'dark';
  strategy?: string;
}

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    created_at: string;
    variants: Variant[];
  };
  priority?: boolean;
  isFavorite?: boolean;
  onFavoriteToggle?: (projectId: string) => void;
}

export default function ProjectCard({ project, priority = false, isFavorite = false, onFavoriteToggle }: ProjectCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const variants = project.variants;
  const currentVariant = variants[currentIndex];
  
  const isDarkBg = currentVariant?.recommended_background === 'dark';
  // Use variant_number if available, otherwise use currentIndex for background color variety
  const bgIndex = ((currentVariant?.variant_number ?? currentIndex + 1) - 1) % 4;
  const bgClass = variantBackgrounds[isDarkBg ? 'dark' : 'light'][bgIndex];
  
  // Arrow colors - no background, just the icon
  const arrowColor = isDarkBg ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-800';
  
  // Counter styles - no hover (not clickable), matches arrow contrast
  const counterBg = isDarkBg ? 'bg-white/80' : 'bg-gray-600/60';
  const counterText = isDarkBg ? 'text-gray-700' : 'text-white';
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavoriteToggle?.(project.id);
  };
  
  const goToPrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? variants.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === variants.length - 1 ? 0 : prev + 1));
  };

  const goToIndex = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(index);
  };

  return (
    <div className="group block bg-surface rounded-sm overflow-hidden shadow-sm hover:shadow-md hover:ring-1 hover:ring-accent/20 hover:-translate-y-0.5 transition-all duration-200 border border-border">
      {/* Thumbnail with Carousel */}
      <div 
        className={`aspect-square ${bgClass} relative overflow-hidden`}
        style={getDotPatternStyle(isDarkBg)}
      >
        {/* Variant Image */}
        {currentVariant?.image_url ? (
          <Link href={`/designs/${project.id}`} className="block w-full h-full">
            <Image
              src={currentVariant.thumbnail_url || currentVariant.image_url}
              alt={`${project.name} - Variant ${currentIndex + 1}`}
              fill
              loading={priority ? "eager" : "lazy"}
              priority={priority}
              className="object-contain p-6 transition-opacity duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 250px"
            />
          </Link>
        ) : (
          <Link href={`/designs/${project.id}`} className="absolute inset-0 flex items-center justify-center text-muted">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </Link>
        )}
        
        {/* Navigation Arrows - No background, just icons */}
        {variants.length > 1 && (
          <>
            {/* Left Arrow */}
            <button
              onClick={goToPrevious}
              className={`absolute left-1 top-1/2 -translate-y-1/2 p-1 ${arrowColor} active:scale-90 transition-all duration-200 z-10`}
              aria-label="Previous variant"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Right Arrow */}
            <button
              onClick={goToNext}
              className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 ${arrowColor} active:scale-90 transition-all duration-200 z-10`}
              aria-label="Next variant"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        
        {/* Subtle counter - Not clickable, no hover */}
        {variants.length > 1 && (
          <div className="absolute top-1.5 right-1.5">
            <span className={`px-1.5 py-0.5 text-[10px] font-medium ${counterText} ${counterBg} backdrop-blur-sm rounded-sm`}>
              {currentIndex + 1}/{variants.length}
            </span>
          </div>
        )}
        
        {/* Dot Indicators - Subtle */}
        {variants.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
            {variants.map((_, index) => (
              <button
                key={index}
                onClick={(e) => goToIndex(e, index)}
                className={`rounded-full transition-all duration-200 ${
                  index === currentIndex 
                    ? 'w-3 h-1 bg-orange' 
                    : 'w-1 h-1 bg-gray-400/50 hover:bg-gray-400/70'
                }`}
                aria-label={`Go to variant ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Footer - dark mode compatible */}
      <div className="px-3 py-2 bg-surface">
        <div className="flex items-center justify-between">
          <Link href={`/designs/${project.id}`} className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate pr-2 hover:text-accent transition-colors">
              {project.name}
            </h3>
          </Link>
          <div className="flex items-center gap-1">
            {/* Favorite Button */}
            {onFavoriteToggle && (
              <button
                onClick={handleFavoriteClick}
                className={`
                  p-1 rounded transition-all duration-200
                  ${isFavorite 
                    ? 'text-orange' 
                    : 'text-muted hover:text-orange opacity-0 group-hover:opacity-100'
                  }
                `}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg 
                  className="w-4 h-4" 
                  fill={isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            )}
            {/* Clickable indicator - light green bg, dark green arrow */}
            <Link 
              href={`/designs/${project.id}`}
              className="w-5 h-5 rounded bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white flex items-center justify-center transition-all duration-200 flex-shrink-0"
            >
              <svg 
                className="w-3 h-3" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
