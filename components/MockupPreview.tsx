"use client";

import { useState } from "react";
import Image from "next/image";
import { PRESETS, PresetType, getPreviewStyle } from "@/lib/image-processing";

interface MockupPreviewProps {
  designUrl: string;
  preset: PresetType;
  backgroundColor: string;
  productType?: string;
  size?: "sm" | "md" | "lg";
}

export default function MockupPreview({
  designUrl,
  preset,
  backgroundColor,
  productType = "tshirt",
  size = "md",
}: MockupPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-40 h-40",
    lg: "w-64 h-64",
  };

  // Get the mockup image based on product type and color
  const getMockupPath = () => {
    const isLight = ["white", "light", "cream", "natural", "sand", "beige"].some(
      c => backgroundColor.toLowerCase().includes(c)
    );
    const colorSuffix = isLight ? "white" : "black";
    
    // Map product type to mockup file
    const mockupMap: Record<string, string> = {
      tshirt: `tshirt-${colorSuffix}`,
      hoodie: `sweatshirt-${colorSuffix}`,
      sweatshirt: `sweatshirt-${colorSuffix}`,
      canvas: `canvas-${colorSuffix}`,
    };

    const mockupKey = Object.keys(mockupMap).find(key => 
      productType.toLowerCase().includes(key)
    ) || "tshirt";

    return `/mockups/${mockupMap[mockupKey]}.png`;
  };

  // Get position for design overlay based on product type
  const getDesignPosition = () => {
    if (productType.toLowerCase().includes("canvas") || productType.toLowerCase().includes("poster")) {
      return {
        top: "5%",
        left: "5%",
        width: "90%",
        height: "90%",
      };
    }
    
    // Default t-shirt/hoodie position
    return {
      top: "28%",
      left: "25%",
      width: "50%",
      height: "40%",
    };
  };

  const designPosition = getDesignPosition();

  return (
    <div className={`relative ${sizeClasses[size]} rounded-lg overflow-hidden bg-secondary`}>
      {/* Product mockup background */}
      <div className="absolute inset-0">
        <Image
          src={getMockupPath()}
          alt={`${productType} mockup`}
          fill
          className="object-contain"
          sizes={size === "lg" ? "256px" : size === "md" ? "160px" : "96px"}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Design overlay with preset filter */}
      <div
        className="absolute transition-opacity duration-300"
        style={{
          ...designPosition,
          opacity: imageLoaded ? 1 : 0,
        }}
      >
        <div 
          className="relative w-full h-full"
          style={getPreviewStyle(preset)}
        >
          <Image
            src={designUrl}
            alt="Design preview"
            fill
            className="object-contain"
            sizes={size === "lg" ? "200px" : size === "md" ? "100px" : "60px"}
          />
        </div>
      </div>

      {/* Preset label */}
      <div className="absolute bottom-1 left-1 right-1">
        <span className="text-[10px] font-medium text-white bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
          {PRESETS[preset].name}
        </span>
      </div>
    </div>
  );
}

// Compact variant for side-by-side comparison
interface MockupComparisonProps {
  designUrl: string;
  lightPreset: PresetType;
  darkPreset: PresetType;
  productType?: string;
}

export function MockupComparison({
  designUrl,
  lightPreset,
  darkPreset,
  productType = "tshirt",
}: MockupComparisonProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <p className="text-xs font-medium text-muted mb-2 text-center">Light Colors</p>
        <MockupPreview
          designUrl={designUrl}
          preset={lightPreset}
          backgroundColor="white"
          productType={productType}
          size="md"
        />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-muted mb-2 text-center">Dark Colors</p>
        <MockupPreview
          designUrl={designUrl}
          preset={darkPreset}
          backgroundColor="black"
          productType={productType}
          size="md"
        />
      </div>
    </div>
  );
}

