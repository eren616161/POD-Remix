"use client";

import { useState, useEffect } from "react";

interface LoadingSpinnerProps {
  message?: string;
  subMessage?: string;
  imagePreview?: string;
  estimatedTime?: number; // in seconds
}

// Educational tips that rotate during loading
const tips = [
  { emoji: "💡", text: "POD designs work best with high contrast for print quality" },
  { emoji: "🎨", text: "AI analyzes color harmony and composition for optimal variations" },
  { emoji: "📐", text: "Each variant explores different visual strategies to expand your catalog" },
  { emoji: "✨", text: "Bold, simple designs tend to sell better across all product types" },
  { emoji: "🚀", text: "Faster than making coffee! Your AI designs are brewing..." },
];

// Analysis steps shown during processing
const analysisSteps = [
  { label: "Analyzing colors", duration: 3 },
  { label: "Detecting style", duration: 3 },
  { label: "Finding patterns", duration: 3 },
  { label: "Generating variations", duration: 12 },
];

export default function LoadingSpinner({
  message = "Analyzing and generating 4 variants...",
  subMessage,
  imagePreview,
  estimatedTime = 20,
}: LoadingSpinnerProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Progress bar animation - time-based with easing
  useEffect(() => {
    // Use an easing function for smooth, natural progress
    // Progress accelerates at start, slows near end (never reaches 100%)
    const rawProgress = elapsedTime / estimatedTime;
    // Ease-out cubic: accelerates then decelerates, caps at 95%
    const easedProgress = rawProgress < 1 
      ? (1 - Math.pow(1 - rawProgress, 3)) * 95
      : 95 + (rawProgress - 1) * 0.5; // Very slow creep after estimated time
    
    setProgress(Math.min(98, easedProgress));
  }, [elapsedTime, estimatedTime]);

  // Cycle through analysis steps based on time
  useEffect(() => {
    let accumulatedTime = 0;
    for (let i = 0; i < analysisSteps.length; i++) {
      accumulatedTime += analysisSteps[i].duration;
      if (elapsedTime < accumulatedTime) {
        setCurrentStepIndex(i);
        break;
      }
      if (i === analysisSteps.length - 1) {
        setCurrentStepIndex(i);
      }
    }
  }, [elapsedTime]);

  const currentTip = tips[tipIndex];

  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-12">
      {/* Container Card with subtle solid border */}
      <div className="relative bg-surface rounded p-6 md:p-8 shadow-xl text-center max-w-lg w-full overflow-hidden border border-orange/20">
        
        {/* Content wrapper */}
        <div className="relative z-10 space-y-1">
          {/* AI Analysis Visualization */}
          {imagePreview && (
            <div className="relative w-40 h-40 md:w-48 md:h-48 mx-auto mb-6">
              {/* Image Preview */}
              <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl border-2 border-accent/20">
                <img
                  src={imagePreview}
                  alt="Analyzing..."
                  className="w-full h-full object-contain bg-secondary"
                />
                
                {/* Single subtle scan line - solid accent color */}
                <div className="absolute inset-0 overflow-hidden">
                  <div 
                    className="absolute inset-x-0 h-1 bg-accent"
                    style={{
                      boxShadow: '0 0 8px var(--color-accent)',
                      animation: 'scan 2s ease-in-out infinite',
                    }}
                  />
                </div>
                
                {/* Corner Brackets - accent and orange */}
                <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-accent rounded-tl-sm" />
                <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-orange rounded-tr-sm" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-orange rounded-bl-sm" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent rounded-br-sm" />
              </div>
              
              {/* Analysis Label - solid accent color */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full shadow-lg bg-accent">
                <span className="text-xs font-semibold text-white whitespace-nowrap tracking-wide">
                  {analysisSteps[currentStepIndex]?.label || "Processing..."}
                </span>
              </div>
            </div>
          )}

          {/* Spinner (shown when no preview) - solid accent color */}
          {!imagePreview && (
            <div className="relative w-24 h-24 mx-auto mb-1">
              <div className="absolute inset-0 border-4 border-secondary rounded-full"></div>
              <div
                className="absolute inset-0 rounded-full animate-spin border-4 border-transparent border-t-accent"
                style={{ animationDuration: "1.2s" }}
              ></div>
              {/* Inner pulse - solid accent */}
              <div className="absolute inset-4 rounded-full animate-pulse bg-accent/10" />
            </div>
          )}

          {/* Message */}
          <h2 className="text-xl font-bold text-foreground">{message}</h2>

          {/* Sub message */}
          <p className="text-sm text-muted">{subMessage || "This usually takes 15-30 seconds"}</p>

          {/* Progress Bar - Time-based with percentage */}
          <div className="space-y-1">
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out bg-orange"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted text-right">{Math.round(progress)}%</p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-1 text-left">
            {analysisSteps.map((step, index) => (
              <ProgressStep
                key={step.label}
                label={step.label}
                isActive={index === currentStepIndex}
                isComplete={index < currentStepIndex}
              />
            ))}
          </div>

          {/* Rotating Educational Tips */}
          <div
            className="p-4 rounded border border-orange/30 bg-orange/5"
            key={tipIndex}
          >
            <div className="flex items-center gap-3 animate-fadeIn">
              <span className="text-2xl flex-shrink-0">{currentTip.emoji}</span>
              <p className="text-sm text-muted text-left">{currentTip.text}</p>
            </div>
          </div>

          {/* Tip indicator dots */}
          <div className="flex justify-center gap-1">
            {tips.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === tipIndex 
                    ? "w-6 bg-orange" 
                    : "w-1.5 bg-muted/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProgressStepProps {
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

function ProgressStep({ label, isActive, isComplete }: ProgressStepProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`
          w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
          transition-all duration-300
          ${isComplete ? "bg-accent" : ""}
          ${isActive ? "bg-accent/15 border-2 border-accent" : ""}
          ${!isComplete && !isActive ? "bg-secondary border border-border" : ""}
        `}
      >
        {isComplete && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {isActive && (
          <div className="w-2 h-2 rounded-full animate-pulse bg-accent" />
        )}
      </div>
      <span
        className={`
          transition-colors duration-300
          ${isComplete ? "text-accent font-medium" : ""}
          ${isActive ? "text-accent font-semibold" : ""}
          ${!isComplete && !isActive ? "text-muted" : ""}
        `}
      >
        {label}
      </span>
    </div>
  );
}
