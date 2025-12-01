"use client";

import { useState, useEffect } from "react";

interface TransformExample {
  id: number;
  before: string;
  after: string;
  label: string;
}

// Example transformations showcasing the value proposition
const examples: TransformExample[] = [
  {
    id: 1,
    before: "🎨",
    after: "✨",
    label: "Style Remix",
  },
  {
    id: 2,
    before: "🖼️",
    after: "🎭",
    label: "Color Shift",
  },
  {
    id: 3,
    before: "💡",
    after: "🌟",
    label: "Bold Variant",
  },
  {
    id: 4,
    before: "📐",
    after: "🔮",
    label: "Creative Mix",
  },
];

export default function ValuePreview() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-rotate on mobile
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % examples.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto mb-10">
      {/* Value Proposition Text */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary rounded mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-sm font-medium text-primary">AI-Powered Design Variations</span>
        </div>
        <p className="text-lg md:text-xl font-medium text-foreground">
          Upload <span className="text-primary font-bold">1 design</span> → Get{" "}
          <span className="text-accent font-bold">4 AI variations</span> in{" "}
          <span className="text-primary font-bold">30 seconds</span>
        </p>
      </div>

      {/* Desktop: Horizontal cards */}
      <div className="hidden md:flex justify-center gap-4">
        {examples.map((example, index) => (
          <TransformCard
            key={example.id}
            example={example}
            isActive={index === activeIndex}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>

      {/* Mobile: Horizontal scroll with snap */}
      <div className="md:hidden">
        <div
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {examples.map((example, index) => (
            <div
              key={example.id}
              className="flex-shrink-0 snap-center"
              style={{ width: "calc(100% - 48px)" }}
            >
              <TransformCard
                example={example}
                isActive={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              />
            </div>
          ))}
        </div>

        {/* Indicator dots */}
        <div className="flex justify-center gap-2 mt-2">
          {examples.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "bg-primary w-6"
                  : "bg-muted hover:bg-primary/50"
              }`}
              aria-label={`Go to example ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface TransformCardProps {
  example: TransformExample;
  isActive: boolean;
  onClick: () => void;
}

function TransformCard({ example, isActive, onClick }: TransformCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center p-4 rounded
        border-2 transition-all duration-300
        ${
          isActive
            ? "border-primary bg-primary/5 scale-105 shadow-lg shadow-primary/20"
            : "border-border bg-surface hover:border-primary/50 hover:shadow-md"
        }
      `}
    >
      {/* Transform animation */}
      <div className="flex items-center gap-3 mb-3">
        {/* Before */}
        <div
          className={`
            w-14 h-14 rounded bg-muted/20 flex items-center justify-center text-2xl
            transition-all duration-300
            ${isActive ? "scale-90 opacity-70" : ""}
          `}
        >
          {example.before}
        </div>

        {/* Arrow */}
        <div
          className={`
            flex items-center justify-center
            transition-all duration-300
            ${isActive ? "scale-110 text-primary" : "text-muted"}
          `}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </div>

        {/* After */}
        <div
          className={`
            w-14 h-14 rounded flex items-center justify-center text-2xl
            transition-all duration-500
            ${
              isActive
                ? "bg-secondary scale-110 animate-pulse"
                : "bg-muted/20"
            }
          `}
        >
          {example.after}
        </div>
      </div>

      {/* Label */}
      <span
        className={`
          text-sm font-medium transition-colors duration-300
          ${isActive ? "text-primary" : "text-muted"}
        `}
      >
        {example.label}
      </span>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
      )}
    </button>
  );
}

