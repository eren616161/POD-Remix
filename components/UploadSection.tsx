"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface UploadSectionProps {
  onImageSelect: (file: File, preview: string) => void;
  onClear?: () => void;
  onGenerate?: () => void;
  hasImage?: boolean;
  // Free tier props
  remainingGenerations?: number;
  isAtLimit?: boolean;
  onSignIn?: () => void;
}

export default function UploadSection({ 
  onImageSelect, 
  onClear, 
  onGenerate,
  remainingGenerations,
  isAtLimit,
  onSignIn
}: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setPreview(previewUrl);
      onImageSelect(file, previewUrl);
    };
    reader.onerror = () => {
      console.error("Failed to read file");
      reader.abort();
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setUrlError("Please enter a URL");
      return;
    }

    try {
      new URL(urlInput);
    } catch {
      setUrlError("Please enter a valid URL");
      return;
    }

    setUrlLoading(true);
    setUrlError(null);

    try {
      const response = await fetch(urlInput);
      if (!response.ok) {
        throw new Error("Failed to fetch image");
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.startsWith("image/")) {
        throw new Error("URL does not point to an image");
      }

      const blob = await response.blob();
      const file = new File([blob], "uploaded-image.png", { type: blob.type });

      const reader = new FileReader();
      reader.onloadend = () => {
        const previewUrl = reader.result as string;
        setPreview(previewUrl);
        onImageSelect(file, previewUrl);
        setUrlInput("");
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      setUrlError(
        error instanceof Error ? error.message : "Failed to load image from URL"
      );
    } finally {
      setUrlLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleUrlSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* Visual Process Indicator - POD Style */}
      <div className="flex items-center justify-center gap-3 md:gap-6 py-5 px-2">
        {/* Source - Bestseller Product Listing */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="relative">
            {/* Mini Product Card */}
            <div className="w-28 md:w-32 bg-white rounded border border-slate-200 shadow-lg overflow-hidden">
              {/* Listing header */}
              <div className="bg-slate-50 px-2.5 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                <div className="flex text-amber-400 text-[10px]">★★★★★</div>
                <span className="text-[10px] text-slate-500 font-medium">2.4k</span>
              </div>
              {/* T-shirt mockup */}
              <div className="p-2.5 flex justify-center">
                <svg viewBox="0 0 60 70" className="w-16 h-[72px] md:w-[72px] md:h-20">
                  {/* T-shirt silhouette - dark */}
                  <path d="M12 12 L5 20 L5 28 L12 25 L12 65 L48 65 L48 25 L55 28 L55 20 L48 12 L40 8 C38 12 34 14 30 14 C26 14 22 12 20 8 L12 12 Z" fill="#1e293b"/>
                  {/* Collar */}
                  <ellipse cx="30" cy="12" rx="8" ry="4" fill="#0f172a"/>
                  {/* Design on shirt - Mountains with sun */}
                  <g transform="translate(15, 22) scale(0.5)">
                    <circle cx="50" cy="10" r="6" fill="#fbbf24"/>
                    <path d="M5 50 L20 20 L30 30 L42 18 L55 50 Z" fill="#f97316"/>
                    <path d="M12 50 L30 25 L48 50 Z" fill="#fb923c"/>
                  </g>
                </svg>
              </div>
              {/* Price */}
              <div className="px-2.5 pb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">$24.99</span>
                <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-semibold">Bestseller</span>
              </div>
            </div>
            {/* Screenshot indicator */}
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shadow-md">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          {/* Source platforms */}
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="font-medium">Amazon</span>
            <span className="text-slate-300">•</span>
            <span className="font-medium">Etsy</span>
            <span className="text-slate-300">•</span>
            <span className="font-medium">Pinterest</span>
          </div>
        </div>

        {/* Simple Arrow Flow */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0 -mt-4">
          <svg className="w-16 h-8" viewBox="0 0 64 32" fill="none">
            {/* Arrow as single connected path */}
            <path 
              d="M4 16 L52 16 M44 10 L52 16 L44 22" 
              stroke="#0f766e" 
              strokeWidth="2" 
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="animate-arrowPulse"
            />
          </svg>
        </div>

        {/* 4 T-Shirt Mockup Variants */}
        <div className="flex flex-col items-center gap-2">
          <div className="grid grid-cols-2 gap-1.5">
            {/* Variant 1 - Single large mountain, teal/cyan on Black */}
            <div className="w-14 h-16 md:w-16 md:h-[72px] rounded bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-200 shadow-md flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
              <svg viewBox="0 0 50 58" className="w-12 h-14 md:w-14 md:h-16">
                <path d="M10 10 L4 16 L4 22 L10 20 L10 54 L40 54 L40 20 L46 22 L46 16 L40 10 L34 7 C32 10 28 12 25 12 C22 12 18 10 16 7 L10 10 Z" fill="#1e293b"/>
                <ellipse cx="25" cy="10" rx="6" ry="3" fill="#0f172a"/>
                {/* Single big mountain with moon */}
                <g transform="translate(12, 18) scale(0.45)">
                  <circle cx="52" cy="8" r="5" fill="#67e8f9"/>
                  <path d="M10 52 L30 15 L50 52 Z" fill="#06b6d4"/>
                  <path d="M30 15 L38 28 L30 25 L22 28 Z" fill="#a5f3fc"/>
                </g>
              </svg>
            </div>
            {/* Variant 2 - Geometric/minimal on White */}
            <div className="w-14 h-16 md:w-16 md:h-[72px] rounded bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-200 shadow-md flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
              <svg viewBox="0 0 50 58" className="w-12 h-14 md:w-14 md:h-16">
                <path d="M10 10 L4 16 L4 22 L10 20 L10 54 L40 54 L40 20 L46 22 L46 16 L40 10 L34 7 C32 10 28 12 25 12 C22 12 18 10 16 7 L10 10 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
                <ellipse cx="25" cy="10" rx="6" ry="3" fill="#f1f5f9"/>
                {/* Geometric triangles */}
                <g transform="translate(12, 18) scale(0.45)">
                  <path d="M15 50 L30 22 L45 50 Z" fill="none" stroke="#334155" strokeWidth="2.5"/>
                  <path d="M22 50 L30 35 L38 50" fill="none" stroke="#64748b" strokeWidth="2"/>
                  <circle cx="30" cy="12" r="4" fill="none" stroke="#334155" strokeWidth="2"/>
                </g>
              </svg>
            </div>
            {/* Variant 3 - Sunset layers, purple/pink on Black */}
            <div className="w-14 h-16 md:w-16 md:h-[72px] rounded bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-200 shadow-md flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
              <svg viewBox="0 0 50 58" className="w-12 h-14 md:w-14 md:h-16">
                <path d="M10 10 L4 16 L4 22 L10 20 L10 54 L40 54 L40 20 L46 22 L46 16 L40 10 L34 7 C32 10 28 12 25 12 C22 12 18 10 16 7 L10 10 Z" fill="#1e293b"/>
                <ellipse cx="25" cy="10" rx="6" ry="3" fill="#0f172a"/>
                {/* Layered sunset mountains */}
                <g transform="translate(12, 18) scale(0.45)">
                  <ellipse cx="30" cy="12" rx="8" ry="8" fill="#fbbf24"/>
                  <path d="M5 52 L20 30 L35 52 Z" fill="#a855f7"/>
                  <path d="M25 52 L40 28 L55 52 Z" fill="#c084fc"/>
                  <path d="M15 52 L30 38 L45 52 Z" fill="#e879f9"/>
                </g>
              </svg>
            </div>
            {/* Variant 4 - Vintage badge style on Cream */}
            <div className="w-14 h-16 md:w-16 md:h-[72px] rounded bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-200 shadow-md flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
              <svg viewBox="0 0 50 58" className="w-12 h-14 md:w-14 md:h-16">
                <path d="M10 10 L4 16 L4 22 L10 20 L10 54 L40 54 L40 20 L46 22 L46 16 L40 10 L34 7 C32 10 28 12 25 12 C22 12 18 10 16 7 L10 10 Z" fill="#fef3c7"/>
                <ellipse cx="25" cy="10" rx="6" ry="3" fill="#fde68a"/>
                {/* Vintage circle badge with mountain */}
                <g transform="translate(12, 17) scale(0.45)">
                  <circle cx="30" cy="28" r="22" fill="none" stroke="#78716c" strokeWidth="2.5"/>
                  <path d="M18 38 L30 20 L42 38 Z" fill="#78716c"/>
                  <circle cx="38" cy="18" r="4" fill="#d97706"/>
                  <path d="M15 44 L45 44" stroke="#78716c" strokeWidth="2"/>
                </g>
              </svg>
            </div>
          </div>
          <span className="text-xs text-accent font-semibold">4 print-ready designs</span>
        </div>
      </div>

      {/* Main Upload Card */}
      <div className="bg-white rounded border border-border shadow-sm overflow-hidden relative">
        {/* Clear/Cancel button - at top of card */}
        {preview && onClear && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
              onClear();
            }}
            className="
              absolute top-3 right-3
              w-7 h-7 rounded-full
              bg-secondary hover:bg-border
              text-muted hover:text-foreground
              flex items-center justify-center
              transition-all duration-200
              z-10
            "
            title="Remove image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Simplified Drop Zone - Clean with accent border */}
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            group relative p-6 cursor-pointer transition-all duration-200
            ${isDragging 
              ? "bg-accent/5 border-b-2 border-accent" 
              : "bg-secondary/30 hover:bg-secondary/50 border-b border-border"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          {preview ? (
            <div className="space-y-3">
              <div className="relative w-full aspect-square max-w-[180px] mx-auto overflow-hidden rounded shadow-lg border border-border">
                <img
                  src={preview}
                  alt="Upload preview"
                  className="w-full h-full object-contain bg-background"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    setPreview(null);
                  }}
                />
              </div>
              {onGenerate && !isAtLimit && (
                <div className="space-y-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerate();
                    }}
                    className="
                      mx-auto
                      px-6 py-2.5
                      bg-orange
                      text-white
                      font-semibold
                      text-sm
                      rounded
                      hover:bg-orange-hover
                      active:scale-[0.98]
                      transition-all duration-200
                      focus-ring
                      flex items-center justify-center gap-2
                      shadow-orange-glow
                      hover:shadow-orange-glow-hover
                    "
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Variants
                  </button>
                  {/* Usage indicator for free tier */}
                  {remainingGenerations !== undefined && remainingGenerations >= 0 && (
                    <p className="text-xs text-muted text-center">
                      <span className="font-medium text-accent">{remainingGenerations}</span> free design{remainingGenerations !== 1 ? 's' : ''} left today
                    </p>
                  )}
                </div>
              )}
              
              {/* Rate limit reached state */}
              {isAtLimit && (
                <div className="space-y-3 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Daily limit reached
                  </div>
                  <p className="text-sm text-muted">
                    Sign up for free to get unlimited designs
                  </p>
                  {onSignIn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSignIn();
                      }}
                      className="
                        mx-auto
                        px-6 py-2.5
                        bg-accent
                        text-white
                        font-semibold
                        text-sm
                        rounded
                        hover:bg-accent/90
                        active:scale-[0.98]
                        transition-all duration-200
                        focus-ring
                        flex items-center justify-center gap-2
                        shadow-cyan-glow
                        hover:shadow-cyan-glow-hover
                      "
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Sign Up Free
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              {/* Minimal upload indicator - Accent themed */}
              <div className={`
                w-16 h-16 mx-auto mb-3 rounded flex items-center justify-center transition-all duration-300
                ${isDragging 
                  ? "bg-accent/15 scale-110" 
                  : "bg-accent/10 group-hover:bg-accent/15"
                }
              `}>
                <svg
                  className="w-8 h-8 transition-colors duration-300 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-base font-semibold text-foreground">
                Drop Screenshot or Browse
              </p>
              <p className="text-xs text-muted mt-1">
                PNG, JPG, WEBP
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative px-6 py-3">
          <div className="absolute inset-0 flex items-center px-6">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs text-muted">or paste URL</span>
          </div>
        </div>

        {/* URL Input - Clean with accent focus */}
        <div className="px-5 pb-5">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="https://..."
                className={`
                  w-full px-3 py-2.5 rounded text-sm
                  bg-secondary/50 border
                  text-foreground placeholder:text-muted/50
                  focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white
                  transition-all duration-200
                  ${urlError 
                    ? "border-destructive focus:border-destructive" 
                    : "border-border focus:border-accent"
                  }
                `}
              />
              {urlError && (
                <p className="absolute -bottom-5 left-0 text-xs text-destructive">
                  {urlError}
                </p>
              )}
            </div>
            <button
              onClick={handleUrlSubmit}
              disabled={urlLoading || !urlInput.trim()}
              className={`
                px-4 py-2.5 rounded font-semibold text-sm
                transition-all duration-200 min-w-[60px]
                flex items-center justify-center
                ${urlLoading || !urlInput.trim()
                  ? "bg-orange/60 text-white/90 cursor-not-allowed"
                  : "bg-orange text-white shadow-orange-glow hover:shadow-orange-glow-hover hover:bg-orange-hover active:scale-95"
                }
              `}
            >
              {urlLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                "Go"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
