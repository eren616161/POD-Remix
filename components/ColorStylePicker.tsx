"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { PrintifyVariant, getUniqueColors, getUniqueSizes } from "@/lib/printify";
import { PRESETS, PresetType } from "@/lib/image-processing";
import { PrintifyMockup, isLightFill, getBellaCanvas3001Image } from "./PrintifyMockups";
import { ProductId, isColorAllowedForProduct } from "@/lib/pod-products";

interface ColorStylePickerProps {
  variants: PrintifyVariant[];
  designUrl: string;
  productType: string;
  productId?: number;
  productTitle?: string;
  onSelectionChange: (selection: ColorStyleSelection) => void;
  initialSelection?: ColorStyleSelection;
}

export interface ColorStyleSelection {
  lightColors: { preset: PresetType; colors: string[]; variantIds: number[] };
  darkColors: { preset: PresetType; colors: string[]; variantIds: number[] };
  sizes: string[];
  sizeVariantIds: number[];
  designPosition: { x: number; y: number; scale: number };
  colorVersions?: Map<string, PresetType>;
}

const COLOR_HEX_MAP: Record<string, string> = {
  'white': '#FFFFFF', 'black': '#1a1a1a', 'navy': '#1B1F3B', 'navy blue': '#1B1F3B',
  'royal blue': '#4169E1', 'royal': '#4169E1', 'red': '#DC2626', 'forest green': '#228B22',
  'forest': '#228B22', 'charcoal': '#36454F', 'heather gray': '#9CA3AF', 'heather grey': '#9CA3AF',
  'sport grey': '#8B8B8B', 'sport gray': '#8B8B8B', 'dark heather': '#4A4A4A', 'maroon': '#800000',
  'purple': '#7C3AED', 'sand': '#C2B280', 'natural': '#F5F5DC', 'light blue': '#ADD8E6',
  'light pink': '#FFB6C1', 'pink': '#FFC0CB', 'gold': '#D4A017', 'orange': '#F97316', 'kelly green': '#4CBB17',
  'brown': '#8B4513', 'cream': '#FFFDD0', 'ash': '#B2BEB5', 'military green': '#4B5320',
  'olive': '#808000', 'dark chocolate': '#3D2314', 'irish green': '#009A44', 'cardinal': '#C41E3A',
  'army': '#4B5320', 'asphalt': '#464646', 'athletic heather': '#B8B8B8', 'dark grey heather': '#5C5C5C',
  'team purple': '#5B2C6F', 'true royal': '#4169E1', 'heather mauve': '#C8A2C8',
};

function getColorHex(colorName: string): string {
  const normalized = colorName.toLowerCase().trim();
  if (COLOR_HEX_MAP[normalized]) return COLOR_HEX_MAP[normalized];
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return hex;
  }
  return '#808080';
}

function isLightColor(hex: string): boolean {
  return isLightFill(hex);
}

function detectProductType(productType: string): 'tshirt' | 'hoodie' | 'sweatshirt' | 'canvas' {
  const lower = productType.toLowerCase();
  // Check hoodie first (more specific)
  if (lower.includes('hoodie') || lower.includes('18500')) return 'hoodie';
  // Check sweatshirt - handles "Sweatshirts" (plural from Printify catalog) and other variations
  if (lower.includes('sweatshirt') || lower.includes('18000') || lower.includes('crewneck')) return 'sweatshirt';
  if (lower.includes('canvas') || lower.includes('poster') || lower.includes('print')) return 'canvas';
  return 'tshirt';
}

function getPrintAreaStyle(productType: string, useRealImage: boolean = false): React.CSSProperties {
  const type = detectProductType(productType);
  switch (type) {
    case 'hoodie': return { top: '26%', left: '50%', transform: 'translateX(-50%)', width: '34%', aspectRatio: '0.9' };
    // Sweatshirt: SVG viewBox 945x726
    // SVG print area rect is at: x=338, y=228, width=240, height=274
    // Center: (458, 365) → (48.47%, 50.28% of viewBox)
    // Top edge: 228/726 = 31.4%
    // Width: 240/945 = 25.4%
    case 'sweatshirt': return { top: '31.4%', left: '48.47%', transform: 'translateX(-50%)', width: '25.4%', aspectRatio: '0.876' };
    case 'canvas': return { top: '6%', left: '50%', transform: 'translateX(-50%)', width: '82%', aspectRatio: '0.85' };
    // T-shirt (Bella Canvas 3001):
    // For REAL images: Image is square with dashed rectangle baked in
    // CRITICAL: All mockup images will follow this format with dashed rectangle at same position
    // Based on actual navy mockup: Rectangle is centered, starts ~23.5% from top, 47% width
    // For SVG fallback: viewBox 773x731, rect at x=252, y=180, width=270, height=328
    default: 
      if (useRealImage) {
        // Real product image coordinates - MATCHES the dashed rectangle position in mockup PNGs
        // Print area: 23.5% from top, 47% width, centered horizontally
        // Aspect ratio: 0.823 (3951 × 4800 px Printify spec)
        return { top: '23.5%', left: '50%', transform: 'translateX(-50%)', width: '47%', aspectRatio: '0.823' };
      }
      // SVG coordinates
      return { top: '24.6%', left: '50%', transform: 'translateX(-50%)', width: '34.9%', aspectRatio: '0.823' };
  }
}

// Interactive Design Layer
// Now uses PERCENTAGE-based positioning for consistency across all screen sizes
function DesignLayer({
  designUrl,
  preset,
  position,
  onPositionChange,
}: {
  designUrl: string;
  preset: PresetType;
  position: { x: number; y: number; scale: number };
  onPositionChange: (pos: { x: number; y: number; scale: number }) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ scale: 0, startDistance: 0, centerX: 0, centerY: 0 });
  const designRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelected(true);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPositionStart({ ...position });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      if (isDragging && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        
        // Convert pixel movement to percentage of container size
        const dxPercent = (dx / containerRect.width) * 100;
        const dyPercent = (dy / containerRect.height) * 100;
        
        let newX = positionStart.x + dxPercent;
        let newY = positionStart.y + dyPercent;
        
        // Snap to center when within 3% (equivalent to ~10px in typical container)
        if (Math.abs(newX) < 3) newX = 0;
        if (Math.abs(newY) < 3) newY = 0;
        
        // Limit to -50% to +50% (keeps design within print area)
        onPositionChange({ ...position, x: Math.max(-50, Math.min(50, newX)), y: Math.max(-50, Math.min(50, newY)) });
      } else if (isResizing) {
        const { centerX, centerY, startDistance, scale: startScale } = resizeStart;
        const currentDistance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
        );
        
        const ratio = currentDistance / startDistance;
        // Remove upper limit - allow unlimited expansion, minimum 0.2
        const newScale = Math.max(0.2, startScale * ratio);
        onPositionChange({ ...position, scale: newScale });
      }
    });
  }, [isDragging, isResizing, dragStart, positionStart, resizeStart, position, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    // Remove upper limit for wheel scaling too
    onPositionChange({ ...position, scale: Math.max(0.2, position.scale + delta) });
  }, [position, onPositionChange]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (designRef.current) {
      const rect = designRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const startDistance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      );
      
      setIsResizing(true);
      setResizeStart({ scale: position.scale, startDistance, centerX, centerY });
    }
  }, [position.scale]);

  // Attach global mouse listeners for dragging and resizing
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleDesignClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSelected(true);
  }, []);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Deselect if clicking on the container itself (not the design)
    if (designRef.current && !designRef.current.contains(e.target as Node)) {
      setIsSelected(false);
    }
  }, []);

  // Handle clicks anywhere outside the design to deselect
  useEffect(() => {
    if (!isSelected) return;

    const handleDocumentClick = (e: MouseEvent) => {
      if (designRef.current && !designRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };

    // Use mousedown instead of click to catch it earlier, but with a small delay
    // to allow the design click handler to run first
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleDocumentClick);
    }, 10);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isSelected]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleContainerClick}
    >
      <div
        ref={designRef}
        className={`absolute pointer-events-auto cursor-move ${isSelected ? 'ring-2 ring-accent' : ''}`}
        style={{
          // Position using percentages for consistent rendering across all screen sizes
          left: `calc(50% + ${position.x}%)`,
          top: `calc(50% + ${position.y}%)`,
          width: `${70 * position.scale}%`,
          height: `${70 * position.scale}%`,
          transform: 'translate(-50%, -50%)',
          filter: PRESETS[preset].cssFilter,
          // Disable transitions during drag/resize for smoothness
          transition: (isDragging || isResizing) ? 'none' : 'filter 0.15s ease',
        }}
        onMouseDown={handleMouseDown}
        onClick={handleDesignClick}
      >
        <Image
          src={designUrl}
          alt="Design"
          fill
          className="object-contain pointer-events-none select-none"
          sizes="300px"
          draggable={false}
        />
        
        {/* Resize handles - only show when selected */}
        {isSelected && (
          <>
            <div
              className="absolute -bottom-2 -right-2 w-4 h-4 bg-accent rounded-full cursor-se-resize border-2 border-white shadow-md z-20"
              onMouseDown={handleResizeStart}
            />
            <div
              className="absolute -top-2 -right-2 w-4 h-4 bg-accent rounded-full cursor-ne-resize border-2 border-white shadow-md z-20"
              onMouseDown={handleResizeStart}
            />
            <div
              className="absolute -bottom-2 -left-2 w-4 h-4 bg-accent rounded-full cursor-sw-resize border-2 border-white shadow-md z-20"
              onMouseDown={handleResizeStart}
            />
            <div
              className="absolute -top-2 -left-2 w-4 h-4 bg-accent rounded-full cursor-nw-resize border-2 border-white shadow-md z-20"
              onMouseDown={handleResizeStart}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Design Version Selector Modal
function DesignVersionModal({
  color,
  isLight,
  currentPreset,
  designUrl,
  productType,
  colorHex,
  onSelectPreset,
  onClose,
}: {
  color: string;
  isLight: boolean;
  currentPreset: PresetType;
  designUrl: string;
  productType: string;
  colorHex: string;
  onSelectPreset: (preset: PresetType) => void;
  onClose: () => void;
}) {
  const availablePresets: PresetType[] = isLight 
    ? ['original', 'vibrant', 'vintage', 'muted'] 
    : ['original', 'invert', 'bold', 'muted'];

  return (
    <div className="mt-3 bg-secondary/30 border border-border rounded p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">Design for {color}</span>
        <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded">
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {availablePresets.map((preset) => (
          <button
            key={preset}
            onClick={() => { onSelectPreset(preset); onClose(); }}
            className={`flex flex-col items-center gap-1.5 p-1.5 rounded transition-all ${
              currentPreset === preset ? 'bg-accent/10 ring-1 ring-accent' : 'hover:bg-secondary/50'
            }`}
          >
            <div className="w-14 h-14 relative rounded overflow-hidden bg-gray-100">
              <PrintifyMockup productType={productType} fillColor={colorHex} className="w-full h-full" />
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ filter: PRESETS[preset].cssFilter }}
              >
                <Image src={designUrl} alt="" width={32} height={32} className="object-contain" />
              </div>
            </div>
            <span className="text-xs font-medium text-muted">{PRESETS[preset].name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ColorStylePicker({ variants, designUrl, productType, productId, productTitle, onSelectionChange, initialSelection }: ColorStylePickerProps) {
  // Position x,y are now PERCENTAGES (0 = center, -50 to +50 range)
  const [designPosition, setDesignPosition] = useState(initialSelection?.designPosition || { x: 0, y: 0, scale: 0.9 });
  const [colorVersions, setColorVersions] = useState<Map<string, PresetType>>(
    () => (initialSelection?.colorVersions ? new Map(initialSelection.colorVersions) : new Map())
  );
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const [variantTab, setVariantTab] = useState<'color' | 'size'>('color');
  const [variantSelectorMode, setVariantSelectorMode] = useState<'color' | 'size' | 'both'>('both');

  const uniqueColors = useMemo(() => getUniqueColors(variants), [variants]);
  const uniqueSizes = useMemo(() => getUniqueSizes(variants), [variants]);
  
  // Determine the ProductId from productType to filter colors
  const detectedProductId = useMemo((): ProductId => {
    const lower = productType.toLowerCase();
    if (lower.includes('hoodie') || lower.includes('18500')) return 'hoodie';
    if (lower.includes('sweatshirt') || lower.includes('18000') || lower.includes('crewneck')) return 'sweatshirt';
    if (lower.includes('canvas') || lower.includes('poster') || lower.includes('print')) return 'canvas';
    return 'tshirt';
  }, [productType]);
  
  // Filter colors based on product-specific allowed colors
  const allColors = useMemo(() => {
    return uniqueColors
      .filter(c => isColorAllowedForProduct(detectedProductId, c.color))
      .map(c => ({ ...c, hex: getColorHex(c.color), isLight: isLightColor(getColorHex(c.color)) }));
  }, [uniqueColors, detectedProductId]);

  const [selectedColors, setSelectedColors] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (initialSelection) {
      initialSelection.lightColors.colors.forEach(c => initial.add(c));
      initialSelection.darkColors.colors.forEach(c => initial.add(c));
    } else {
      const firstLight = allColors.find(c => c.isLight);
      const firstDark = allColors.find(c => !c.isLight);
      if (firstLight) initial.add(firstLight.color);
      if (firstDark) initial.add(firstDark.color);
    }
    return initial;
  });

  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set(initialSelection?.sizes || uniqueSizes.slice(0, 4)));
  const [previewColor, setPreviewColor] = useState<string>(() => {
    if (selectedColors.size > 0) return Array.from(selectedColors)[0];
    return allColors[0]?.color || 'White';
  });
  const [lightPreset, setLightPreset] = useState<PresetType>(initialSelection?.lightColors.preset || 'original');
  const [darkPreset, setDarkPreset] = useState<PresetType>(initialSelection?.darkColors.preset || 'invert');

  const getVariantIdsForColors = useCallback((colors: string[]) => variants.filter(v => colors.includes(v.options.color)).map(v => v.id), [variants]);
  const getVariantIdsForSizes = useCallback((sizes: string[]) => variants.filter(v => selectedColors.has(v.options.color) && sizes.includes(v.options.size)).map(v => v.id), [variants, selectedColors]);
  // Get variant IDs for specific colors filtered by selected sizes
  const getVariantIdsForColorsAndSizes = useCallback((colors: string[], sizes: string[]) => 
    variants.filter(v => colors.includes(v.options.color) && sizes.includes(v.options.size)).map(v => v.id), 
    [variants]
  );

  const updateSelection = useCallback((colors: Set<string>, sizes: Set<string>, lPreset?: PresetType, dPreset?: PresetType, pos?: typeof designPosition, versions?: Map<string, PresetType>) => {
    const light = allColors.filter(c => c.isLight && colors.has(c.color)).map(c => c.color);
    const dark = allColors.filter(c => !c.isLight && colors.has(c.color)).map(c => c.color);
    const sizesArray = Array.from(sizes);
    onSelectionChange({
      lightColors: { preset: lPreset || lightPreset, colors: light, variantIds: getVariantIdsForColorsAndSizes(light, sizesArray) },
      darkColors: { preset: dPreset || darkPreset, colors: dark, variantIds: getVariantIdsForColorsAndSizes(dark, sizesArray) },
      sizes: sizesArray,
      sizeVariantIds: getVariantIdsForSizes(sizesArray),
      designPosition: pos || designPosition,
      colorVersions: versions || colorVersions,
    });
  }, [allColors, lightPreset, darkPreset, designPosition, colorVersions, onSelectionChange, getVariantIdsForColorsAndSizes, getVariantIdsForSizes]);

  const toggleColor = (color: string) => {
    const newSet = new Set(selectedColors);
    newSet.has(color) ? newSet.delete(color) : newSet.add(color);
    setSelectedColors(newSet);
    if (newSet.has(color)) setPreviewColor(color);
    updateSelection(newSet, selectedSizes);
  };

  const toggleSize = (size: string) => {
    const newSet = new Set(selectedSizes);
    newSet.has(size) ? newSet.delete(size) : newSet.add(size);
    setSelectedSizes(newSet);
    updateSelection(selectedColors, newSet);
  };

  const handlePositionChange = (pos: typeof designPosition) => {
    setDesignPosition(pos);
    updateSelection(selectedColors, selectedSizes, lightPreset, darkPreset, pos);
  };

  const handleDefaultPresetSelect = useCallback((preset: PresetType) => {
    if (!previewColor) return;
    const nextVersions = new Map(colorVersions);
    nextVersions.set(previewColor, preset);
    setColorVersions(nextVersions);
    console.log(`🎨 Set preset for "${previewColor}": ${preset}`, Array.from(nextVersions.entries()));
    updateSelection(selectedColors, selectedSizes, lightPreset, darkPreset, designPosition, nextVersions);
  }, [previewColor, colorVersions, selectedColors, selectedSizes, lightPreset, darkPreset, designPosition, updateSelection]);

  const detectedType = detectProductType(productType);
  const isCanvas = detectedType === 'canvas';
  const isSweatshirt = detectedType === 'sweatshirt';
  const isTshirt = detectedType === 'tshirt';

  const previewColorData = allColors.find(c => c.color === previewColor) || allColors[0];
  const previewHex = previewColorData?.hex || '#FFFFFF';
  const previewIsLight = previewColorData?.isLight ?? true;
  
  // Check if we have a real image for this color (for Bella Canvas 3001 t-shirts)
  const hasRealImage = isTshirt && getBellaCanvas3001Image(previewColor) !== null;
  
  const getPresetForColor = (color: string, isLight: boolean) => {
    if (colorVersions.has(color)) return colorVersions.get(color)!;
    return isLight ? lightPreset : darkPreset;
  };
  const currentPreset = getPresetForColor(previewColor, previewIsLight);

  const selectedColorsList = useMemo(() => allColors.filter(c => selectedColors.has(c.color)), [allColors, selectedColors]);

  // Check if current color has a specific design version
  // Standardized preset list (Option A)
  const defaultPresetOptions: PresetType[] = ['original', 'vibrant', 'vintage', 'invert'];
  const selectedColorPreset = currentPreset;

  // Auto-assign a preset when a color becomes the preview color and has no override
  useEffect(() => {
    if (!previewColor) return;
    if (colorVersions.has(previewColor)) return;
    const isLight = allColors.find(c => c.color === previewColor)?.isLight ?? true;
    const autoPreset = isLight ? lightPreset : darkPreset;
    const next = new Map(colorVersions);
    next.set(previewColor, autoPreset);
    setColorVersions(next);
    updateSelection(selectedColors, selectedSizes, lightPreset, darkPreset, designPosition, next);
  }, [previewColor, colorVersions, allColors, lightPreset, darkPreset, selectedColors, selectedSizes, designPosition, updateSelection]);

  return (
    <div className="flex gap-4 h-full w-full">
      {/* Left: Preview Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className={`flex-1 rounded-lg relative overflow-hidden shadow-sm border border-border/50 ${isSweatshirt ? 'bg-[#F5F5F2]' : isCanvas ? 'bg-white dark:bg-gray-900' : 'bg-[#FAFAFA] dark:bg-gray-800'}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Container for both SVG and design layer - they share the same coordinate system */}
            {/* Real images are square (1:1), SVG mockups have various aspect ratios */}
            <div className={`w-full h-full relative ${
              isCanvas ? 'aspect-[400/500]' 
              : isSweatshirt ? 'aspect-[945/726]' 
              : detectedType === 'hoodie' ? 'aspect-[460/540]' 
              : hasRealImage ? 'max-w-full max-h-full aspect-square' 
              : 'aspect-[773/731]'
            }`}>
              {/* Product mockup - real image or SVG fallback */}
              <PrintifyMockup 
                productType={productType} 
                fillColor={isCanvas ? '#F5F5F5' : previewHex} 
              />
              
              {/* Design layer - positioned relative to the mockup container */}
              {/* Print area position differs between real images (square) and SVG mockups */}
              <div 
                className="absolute" 
                style={getPrintAreaStyle(productType, hasRealImage)}
              >
                <DesignLayer
                  designUrl={designUrl}
                  preset={currentPreset}
                  position={designPosition}
                  onPositionChange={handlePositionChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Printify-style Variants and Layers Panel */}
      <div className="w-[340px] flex flex-col bg-white dark:bg-surface border border-border rounded-lg overflow-hidden shrink-0 shadow-sm">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-secondary/20">
          <span className="text-lg font-semibold text-foreground">Variants and layers</span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Variants Section */}
          {!showVariantSelector && (
            <div className="px-5 pb-5 space-y-5">
              {/* Colors Row */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-sm font-medium text-foreground">Colors</span>
                  <button
                    onClick={() => {
                      setShowVariantSelector(true);
                      setVariantTab('color');
                      setVariantSelectorMode('color');
                    }}
                    className="p-1 hover:bg-secondary/50 rounded transition-colors group"
                    title="Add colors"
                  >
                    <svg className="w-3.5 h-3.5 text-accent group-hover:text-accent/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {selectedColorsList.map(({ color, hex }) => (
                    <button
                      key={color}
                      onClick={() => setPreviewColor(color)}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        previewColor === color ? 'ring-2 ring-accent ring-offset-1 border-white' : 'border-white shadow-sm hover:scale-110'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={color}
                    />
                  ))}
                  {selectedColorsList.length === 0 && (
                    <span className="text-sm text-muted">No colors selected</span>
                  )}
                </div>
              </div>

              {/* Sizes Row */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-sm font-medium text-foreground">Sizes</span>
                  <button
                    onClick={() => {
                      setShowVariantSelector(true);
                      setVariantTab('size');
                      setVariantSelectorMode('size');
                    }}
                    className="p-1 hover:bg-secondary/50 rounded transition-colors group"
                    title="Add sizes"
                  >
                    <svg className="w-3.5 h-3.5 text-accent group-hover:text-accent/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {Array.from(selectedSizes).map(size => (
                    <span key={size} className="px-2.5 py-1 bg-secondary/50 text-sm font-medium text-foreground rounded">
                      {size}
                    </span>
                  ))}
                  {selectedSizes.size === 0 && (
                    <span className="text-sm text-muted">No sizes selected</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inline Variant Selector Panel - Full height when open */}
          {showVariantSelector && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Tabs - Only show if mode is 'both', otherwise hide tabs */}
              {variantSelectorMode === 'both' && (
                <div className="flex border-b border-border shrink-0">
                  <button
                    onClick={() => setVariantTab('color')}
                    className={`flex-1 px-5 py-3 text-base font-medium transition-colors ${
                      variantTab === 'color' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Color ({selectedColors.size})
                  </button>
                  <button
                    onClick={() => setVariantTab('size')}
                    className={`flex-1 px-5 py-3 text-base font-medium transition-colors ${
                      variantTab === 'size' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Size ({selectedSizes.size})
                  </button>
                </div>
              )}

              {/* Sticky Header with Done and Action Buttons */}
              <div className="sticky top-0 z-10 bg-white dark:bg-surface border-b border-border shrink-0">
                {variantTab === 'color' ? (
                  <div className="p-4">
                    {/* Done button - Simple, top right when in single mode */}
                    {variantSelectorMode !== 'both' && (
                      <div className="flex items-center justify-end mb-4">
                        <button
                          onClick={() => {
                            setShowVariantSelector(false);
                            setVariantSelectorMode('both');
                          }}
                          className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const newSet = new Set(allColors.map(c => c.color));
                          setSelectedColors(newSet);
                          updateSelection(newSet, selectedSizes);
                        }} 
                        className="flex-1 px-4 py-2.5 text-sm font-medium bg-secondary/50 hover:bg-secondary rounded"
                      >
                        All
                      </button>
                      <button 
                        onClick={() => {
                          const newSet = new Set<string>();
                          setSelectedColors(newSet);
                          updateSelection(newSet, selectedSizes);
                        }} 
                        className="flex-1 px-4 py-2.5 text-sm font-medium bg-secondary/50 hover:bg-secondary rounded"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    {/* Done button - Simple, top right when in single mode */}
                    {variantSelectorMode !== 'both' && (
                      <div className="flex items-center justify-end mb-4">
                        <button
                          onClick={() => {
                            setShowVariantSelector(false);
                            setVariantSelectorMode('both');
                          }}
                          className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const newSet = new Set(uniqueSizes);
                          setSelectedSizes(newSet);
                          updateSelection(selectedColors, newSet);
                        }} 
                        className="flex-1 px-4 py-2.5 text-sm font-medium bg-secondary/50 hover:bg-secondary rounded"
                      >
                        All
                      </button>
                      <button 
                        onClick={() => {
                          const common = ['S', 'M', 'L', 'XL'].filter(s => uniqueSizes.includes(s));
                          const newSet = new Set(common);
                          setSelectedSizes(newSet);
                          updateSelection(selectedColors, newSet);
                        }} 
                        className="flex-1 px-4 py-2.5 text-sm font-medium bg-secondary/50 hover:bg-secondary rounded"
                      >
                        S-XL
                      </button>
                      <button 
                        onClick={() => {
                          const newSet = new Set<string>();
                          setSelectedSizes(newSet);
                          updateSelection(selectedColors, newSet);
                        }} 
                        className="flex-1 px-4 py-2.5 text-sm font-medium bg-secondary/50 hover:bg-secondary rounded"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tab Content - Scrollable list */}
              <div className="flex-1 overflow-y-auto">
                {variantTab === 'color' ? (
                  <div className="p-4 pt-2">
                    <div className="space-y-1.5">
                      {allColors.map(({ color, hex }) => {
                        const isSelected = selectedColors.has(color);
                        return (
                          <button
                            key={color}
                            onClick={() => toggleColor(color)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors ${
                              isSelected ? 'bg-accent/10' : 'hover:bg-secondary/50'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-border'}`}>
                              {isSelected && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </div>
                            <div className="w-7 h-7 rounded-full border border-white shadow-sm" style={{ backgroundColor: hex }} />
                            <span className="text-base text-foreground flex-1">{color}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 pt-2">
                    <div className="space-y-1.5">
                      {uniqueSizes.map((size) => {
                        const isSelected = selectedSizes.has(size);
                        return (
                          <button
                            key={size}
                            onClick={() => toggleSize(size)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors ${
                              isSelected ? 'bg-accent/10' : 'hover:bg-secondary/50'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-border'}`}>
                              {isSelected && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </div>
                            <span className="text-base text-foreground">{size}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Design Versioning Section - Only show when variant selector is closed */}
          {!showVariantSelector && (
            <div className="p-3 pt-1">
              <div className="relative">
                {/* Default presets for current color category */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-foreground">Design presets</span>
                    <span className="text-[11px] text-muted">
                      {previewIsLight ? 'Best on light colors' : 'Best on dark colors'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {defaultPresetOptions.map((preset) => {
                      const presetThumb: Record<PresetType, { background: string }> = {
                        original: { background: 'linear-gradient(135deg, #dfe4ef, #cbd4e2)' },
                        vibrant: { background: 'linear-gradient(135deg, #ff7ad1, #6a7bff)' },
                        vintage: { background: 'linear-gradient(135deg, #d9b48f, #c79b6b)' },
                        invert: { background: 'linear-gradient(135deg, #f3f3f3, #bfbfbf)' },
                        bold: { background: 'linear-gradient(135deg, #ff5733, #c70039)' },
                        muted: { background: 'linear-gradient(135deg, #95a5a6, #7f8c8d)' },
                      };
                      const currentPresetThumb = presetThumb[preset];

                      return (
                        <button
                          key={preset}
                          onClick={() => handleDefaultPresetSelect(preset)}
                            className={`flex flex-col items-center gap-0.5 p-0.5 rounded border transition-colors ${
                            selectedColorPreset === preset
                              ? 'border-accent bg-accent/5 shadow-sm'
                              : 'border-border bg-white dark:bg-secondary/20 hover:border-accent/50 hover:bg-secondary/30'
                          }`}
                        >
                          <div
                              className="w-11 h-11 rounded-md overflow-hidden border border-border/60 shadow-sm"
                            style={{ background: currentPresetThumb.background }}
                          >
                          </div>
                            <span className="text-xs font-semibold text-foreground">{PRESETS[preset].name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
