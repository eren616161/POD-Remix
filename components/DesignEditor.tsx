"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import SaveDesignsCTA from "@/components/SaveDesignsCTA";

// ============================================================================
// Types
// ============================================================================

interface DesignVersion {
  imageData: string;
  prompt: string;
}

interface Variant {
  id: number;
  strategy: string;
  design: DesignVersion;
}

// URL-based variant from database
interface UrlVariant {
  id: string;
  variant_number: number;
  batch_number?: number;
  strategy: string;
  image_url: string;
  recommended_background: 'light' | 'dark';
}

export interface EditorSettings {
  preset: PresetId;
  scale: number;
  position: { x: number; y: number };
}

interface DesignEditorProps {
  variant?: Variant;
  urlVariant?: UrlVariant;
  mockupType: 'light' | 'dark';
  onSave: (settings: EditorSettings) => void;
  onCancel: () => void;
  returnPath?: string;
  designName?: string;
  batchNumber?: number;
}

// ============================================================================
// Presets - CSS Filter Values for POD
// ============================================================================

type PresetId = "original" | "vibrant" | "vintage" | "invert";

interface Preset {
  id: PresetId;
  name: string;
  cssFilter: string;
  description: string;
  bgClass: string;
  useInverted: boolean;
}

const PRESETS: Preset[] = [
  {
    id: "original",
    name: "Original",
    cssFilter: "none",
    description: "No adjustments - use as-is",
    bgClass: "preset-bg-original",
    useInverted: false,
  },
  {
    id: "vibrant",
    name: "Vibrant",
    cssFilter: "brightness(1.08) contrast(1.35) saturate(1.5)",
    description: "Maximum color pop - eye-catching and bold",
    bgClass: "preset-bg-vibrant",
    useInverted: false,
  },
  {
    id: "vintage",
    name: "Vintage",
    cssFilter: "brightness(1.05) contrast(0.9) saturate(0.65) sepia(0.2)",
    description: "Retro aesthetic - muted, warm tones",
    bgClass: "preset-bg-vintage",
    useInverted: false,
  },
  {
    id: "invert",
    name: "Invert",
    cssFilter: "invert(1) hue-rotate(180deg)", // CSS for instant preview
    description: "Swap light and dark colors for opposite backgrounds",
    bgClass: "preset-bg-invert",
    useInverted: true, // Still true - we'll process on export for quality
  },
];

// ============================================================================
// Component
// ============================================================================

export default function DesignEditor({ variant, urlVariant, mockupType, onSave, onCancel, returnPath, designName, batchNumber }: DesignEditorProps) {
  const { user } = useAuth();
  
  // Determine image source
  const imageSource = variant?.design.imageData || urlVariant?.image_url || '';
  const variantId = variant?.id || urlVariant?.variant_number || 0;
  const strategy = variant?.strategy || urlVariant?.strategy || '';
  const isUrlBased = !!urlVariant;
  const actualBatchNumber = batchNumber || urlVariant?.batch_number || 1;

  // State
  const [activePreset, setActivePreset] = useState<PresetId>("original");
  const [scale, setScale] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSelected, setIsSelected] = useState(true); // Start selected so users see they can adjust
  const [isResizing, setIsResizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedMockup, setSelectedMockup] = useState<'light' | 'dark'>(mockupType);
  const [loadedImageData, setLoadedImageData] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(isUrlBased);
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const designRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ scale: 100, startDistance: 0, centerX: 0, centerY: 0 });

  // Get current preset
  const currentPreset = PRESETS.find((p) => p.id === activePreset) || PRESETS[0];

  // Mockup URL based on selected mockup (user can toggle)
  const mockupUrl = selectedMockup === 'dark' 
    ? '/mockups/tshirt-black.jpg' 
    : '/mockups/tshirt-white.jpg';

  // Check if design is near center (for snap guides)
  const isNearCenterX = Math.abs(position.x) < 10;
  const isNearCenterY = Math.abs(position.y) < 10;

  // Load URL-based image and convert to base64 for editing
  useEffect(() => {
    if (isUrlBased && urlVariant?.image_url) {
      setIsLoadingImage(true);
      
      // Fetch the image and convert to base64 with proper error handling
      fetch(urlVariant.image_url)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch image: ${res.status}`);
          }
          const contentType = res.headers.get('content-type');
          if (contentType && !contentType.startsWith('image/')) {
            throw new Error('URL does not point to an image');
          }
          return res.blob();
        })
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setLoadedImageData(reader.result as string);
            setIsLoadingImage(false);
          };
          reader.onerror = () => {
            console.error('Failed to read image blob');
            setIsLoadingImage(false);
            setExportError('Failed to load image');
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => {
          console.error('Failed to load image:', err);
          setIsLoadingImage(false);
          setExportError(err instanceof Error ? err.message : 'Failed to load image');
        });
    }
  }, [isUrlBased, urlVariant?.image_url]);

  // The actual image data to use (either from prop or loaded from URL)
  const actualImageData = isUrlBased ? (loadedImageData || imageSource) : imageSource;

  // ============================================================================
  // Drag Handlers
  // ============================================================================

  const handleDesignMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelected(true);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
  }, [position]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Click on canvas background deselects
    if (e.target === e.currentTarget) {
      setIsSelected(false);
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      let newX = positionStartRef.current.x + dx;
      let newY = positionStartRef.current.y + dy;
      
      // Snap to center when within 10px
      if (Math.abs(newX) < 10) newX = 0;
      if (Math.abs(newY) < 10) newY = 0;
      
      setPosition({ x: newX, y: newY });
    } else if (isResizing) {
      // Calculate current distance from design center
      const { centerX, centerY, startDistance, scale: startScale } = resizeStartRef.current;
      const currentDistance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      );
      
      // Scale based on ratio of current distance to start distance
      const ratio = currentDistance / startDistance;
      const newScale = Math.max(30, Math.min(200, startScale * ratio));
      setScale(Math.round(newScale));
    }
  }, [isDragging, isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the center of the design element
    if (designRef.current) {
      const rect = designRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate initial distance from center to mouse
      const startDistance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      );
      
      setIsResizing(true);
      resizeStartRef.current = { scale, startDistance, centerX, centerY };
    }
  }, [scale]);

  // Attach global mouse listeners for dragging and resizing
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // CSS filter handles preview instantly - no need to pre-generate inverted image
  // The server-side invert is only called on export for high-quality output

  // Determine which image to show (always use original - CSS filter handles invert preview)
  const displayImage = actualImageData;

  // ============================================================================
  // Export Handler
  // ============================================================================

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      let imageToExport = actualImageData;
      
      // If invert preset is selected, generate inverted image on-demand for export
      // This ensures high-quality luminosity invert (CSS is just for preview)
      if (currentPreset.useInverted) {
        try {
          const invertResponse = await fetch("/api/invert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageData: actualImageData }),
          });
          
          if (!invertResponse.ok) {
            const errorText = await invertResponse.text();
            let errorMessage = "Failed to generate inverted image";
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorMessage;
            } catch {
              // Response wasn't JSON, use text if available
              if (errorText) errorMessage = errorText;
            }
            throw new Error(errorMessage);
          }
          
          const invertData = await invertResponse.json();
          imageToExport = invertData.invertedImage;
        } catch (invertErr) {
          console.error("Invert error:", invertErr);
          throw new Error(invertErr instanceof Error ? invertErr.message : "Failed to invert image");
        }
      }

      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData: imageToExport,
          // Don't apply CSS invert filter since we already processed the image
          filter: currentPreset.useInverted ? "none" : currentPreset.cssFilter,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to export image";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response wasn't JSON
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Generate download filename
      // Format: {DesignName} - V{BatchNumber}, {Strategy}, {Preset}.png
      const safeName = (designName || "Design").replace(/[^a-zA-Z0-9\s-]/g, '').trim();
      const safeStrategy = strategy.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
      const presetName = currentPreset.name;
      const filename = `${safeName} - V${actualBatchNumber}, ${safeStrategy}, ${presetName}.png`;

      // Trigger download
      const link = document.createElement("a");
      link.href = data.exportedImage;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Save settings and close
      onSave({
        preset: activePreset,
        scale: scale,
        position: position,
      });
    } catch (err) {
      console.error("Export error:", err);
      setExportError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsExporting(false);
    }
  };

  // Reset position to center
  const handleCenterDesign = () => {
    setPosition({ x: 0, y: 0 });
  };

  // ============================================================================
  // Render
  // ============================================================================

  // Show loading state if loading image from URL
  if (isLoadingImage) {
    return (
      <div className="max-w-6xl mx-auto w-full flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted">Loading design...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="text-left">
        <h2 className="text-xl md:text-2xl font-bold text-primary mb-2">Design Editor</h2>
        <p className="text-muted">
          {strategy ? `${strategy} • ` : ''}Adjust your design and export as high-resolution PNG
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Canvas Preview */}
        <div className="space-y-4">
          <div className="bg-surface rounded p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-muted">Tshirt</h3>
                <div className="flex items-center gap-4 mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="mockup"
                      checked={selectedMockup === 'light'}
                      onChange={() => setSelectedMockup('light')}
                      className="w-3.5 h-3.5 accent-primary"
                    />
                    <span className="text-xs text-foreground">Light Tee</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="mockup"
                      checked={selectedMockup === 'dark'}
                      onChange={() => setSelectedMockup('dark')}
                      className="w-3.5 h-3.5 accent-primary"
                    />
                    <span className="text-xs text-foreground">Dark Tee</span>
                  </label>
                </div>
              </div>
              <button
                onClick={handleCenterDesign}
                className="text-xs px-2 py-1 text-muted hover:text-foreground hover:bg-muted/20 rounded transition-colors"
              >
                Center Design
              </button>
            </div>

            {/* Canvas Container with Mockup Background - Fixed size */}
            <div
              ref={canvasRef}
              className="relative rounded overflow-hidden mx-auto select-none"
              style={{
                width: 500,
                height: 500,
                backgroundImage: `url(${mockupUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: selectedMockup === 'dark' ? '#1a1a1a' : '#f5f5f5',
              }}
              onClick={handleCanvasClick}
            >
              {/* Center Guides - only show when dragging AND near center */}
              {isDragging && (isNearCenterX || isNearCenterY) && (
                <>
                  {isNearCenterX && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-accent/50 pointer-events-none z-10"
                      style={{ left: "50%" }}
                    />
                  )}
                  {isNearCenterY && (
                    <div
                      className="absolute left-0 right-0 h-px bg-accent/50 pointer-events-none z-10"
                      style={{ top: "50%" }}
                    />
                  )}
                </>
              )}

              {/* Design Image with selection and resize handles */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px)`,
                }}
              >
                <div 
                  ref={designRef}
                  className={`relative pointer-events-auto cursor-move ${isSelected ? 'ring-2 ring-accent' : ''}`}
                  onMouseDown={handleDesignMouseDown}
                >
                  <img
                    src={displayImage}
                    alt="Design preview"
                    className="object-contain pointer-events-none"
                    style={{
                      filter: currentPreset.cssFilter,
                      maxWidth: 300 * (scale / 100),
                      maxHeight: 300 * (scale / 100),
                      transition: isResizing ? 'none' : "filter 0.15s ease, max-width 0.2s ease, max-height 0.2s ease",
                    }}
                    draggable={false}
                    onError={(e) => {
                      e.preventDefault();
                      e.currentTarget.onerror = null;
                    }}
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

              {/* Drag Indicator */}
              {isDragging && (
                <div className="absolute inset-0 bg-accent/5 pointer-events-none" />
              )}
            </div>

            <p className="text-xs text-muted mt-2 text-center">
              Click design to select • Drag to move • Drag corners to resize
            </p>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Guest Sign-In CTA - above presets */}
          {!user && <SaveDesignsCTA variant="compact" />}
          
          {/* Presets */}
          <div className="bg-surface rounded p-4 shadow-lg">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Presets
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setActivePreset(preset.id)}
                  className={`relative group flex flex-col items-center p-2 rounded border-2 transition-all ${
                    activePreset === preset.id
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:scale-[1.02]"
                  }`}
                  title={preset.description}
                >
                  {/* Thumbnail Preview with Gradient Background */}
                  <div className={`w-14 h-14 rounded overflow-hidden ${preset.bgClass} mb-1.5 relative shadow-inner`}>
                    <img
                      src={actualImageData}
                      alt={preset.name}
                      className="w-full h-full object-contain p-1"
                      style={{ filter: preset.cssFilter }}
                      onError={(e) => {
                        e.preventDefault();
                        e.currentTarget.onerror = null;
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight truncate w-full">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {exportError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-sm text-red-600 dark:text-red-400">{exportError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full px-6 py-3 bg-accent text-white font-medium rounded shadow-sm hover:shadow-md hover:bg-accent/90 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export PNG
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium rounded shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              {returnPath ? 'Back to Project' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
