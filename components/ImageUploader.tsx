"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface ImageUploaderProps {
  onImageSelect: (file: File, preview: string) => void;
}

export default function ImageUploader({ onImageSelect }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setPreview(previewUrl);
      onImageSelect(file, previewUrl);
    };
    // Add error handler to prevent unhandled rejection
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

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative
          border-2 border-dashed
          rounded
          p-8
          cursor-pointer
          transition-smooth
          ${
            isDragging
              ? "border-primary bg-surface shadow-lg scale-105"
              : "border-muted hover:border-primary hover:bg-surface"
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
          // Preview Display
          <div className="space-y-4">
            <div className="relative w-full aspect-square max-w-md mx-auto overflow-hidden rounded shadow-md">
              <img
                src={preview}
                alt="Upload preview"
                className="w-full h-full object-contain bg-surface"
                onError={(e) => {
                  // Properly suppress the error event to prevent unhandled rejection in dev mode
                  e.currentTarget.onerror = null;
                  // Reset preview if image fails to load
                  setPreview(null);
                  console.warn("Image preview failed to load");
                }}
              />
            </div>
            <p className="text-center text-sm text-muted">
              Click or drag to change image
            </p>
          </div>
        ) : (
          // Upload Prompt
          <div className="text-center space-y-4">
            {/* Upload Icon */}
            <div className="flex justify-center">
              <svg
                className="w-16 h-16 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            {/* Text */}
            <div>
              <p className="text-lg font-medium mb-2">
                Upload Your POD Design
              </p>
              <p className="text-sm text-muted">
                Drag and drop or click to select
              </p>
              <p className="text-xs text-muted mt-2">
                PNG, JPG, WEBP (max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
