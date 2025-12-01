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
  { label: "Analyzing colors...", duration: 3 },
  { label: "Detecting style...", duration: 3 },
  { label: "Finding patterns...", duration: 3 },
  { label: "Generating variations...", duration: 12 },
];

export default function LoadingSpinner({
  message = "Analyzing and generating 4 variants...",
  subMessage,
  imagePreview,
  estimatedTime = 20,
}: LoadingSpinnerProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(estimatedTime);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Progress bar animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const target = ((estimatedTime - timeRemaining) / estimatedTime) * 100;
        // Smooth progress that slows down near the end
        const newProgress = Math.min(95, prev + (target - prev) * 0.1 + 0.5);
        return newProgress;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [timeRemaining, estimatedTime]);

  // Cycle through analysis steps
  useEffect(() => {
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 1;
      let accumulatedTime = 0;
      for (let i = 0; i < analysisSteps.length; i++) {
        accumulatedTime += analysisSteps[i].duration;
        if (elapsed < accumulatedTime) {
          setCurrentStepIndex(i);
          break;
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentTip = tips[tipIndex];

  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-12">
      {/* Container Card */}
      <div className="bg-white rounded p-6 md:p-8 shadow-card border border-border text-center max-w-lg w-full">
        
        {/* AI Analysis Visualization */}
        {imagePreview && (
          <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-6">
            {/* Image Preview */}
            <div className="relative w-full h-full rounded overflow-hidden shadow-lg">
              <img
                src={imagePreview}
                alt="Analyzing..."
                className="w-full h-full object-contain bg-secondary"
              />
              {/* Scan Overlay Effect */}
              <div className="absolute inset-0 overflow-hidden">
                <div 
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan"
                  style={{
                    animation: "scan 2s ease-in-out infinite",
                  }}
                />
              </div>
              {/* Corner Brackets */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary opacity-80" />
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-primary opacity-80" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-primary opacity-80" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary opacity-80" />
            </div>
            
            {/* Analysis Label */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded shadow-lg">
              <span className="text-xs font-medium text-white whitespace-nowrap">
                {analysisSteps[currentStepIndex]?.label || "Processing..."}
              </span>
            </div>
          </div>
        )}

        {/* Spinner (shown when no preview) */}
        {!imagePreview && (
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-secondary rounded-full"></div>
            <div
              className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"
              style={{ animationDuration: "1s" }}
            ></div>
            {/* Inner pulse */}
            <div className="absolute inset-3 bg-secondary rounded-full animate-pulse" />
          </div>
        )}

        {/* Message */}
        <h2 className="text-xl font-semibold mb-2">{message}</h2>

        {/* Countdown Timer */}
        <div className="mb-4">
          <p className="text-2xl font-bold text-primary mb-1">
            ~{timeRemaining}s
            <span className="text-sm font-normal text-muted ml-2">remaining</span>
          </p>
          <p className="text-xs text-muted">{subMessage || "Faster than making coffee ☕"}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-secondary rounded overflow-hidden mb-6">
          <div
            className="h-full bg-primary rounded transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Steps */}
        <div className="space-y-2 text-left mb-6">
          {analysisSteps.map((step, index) => (
            <ProgressStep
              key={step.label}
              label={step.label.replace("...", "")}
              isActive={index === currentStepIndex}
              isComplete={index < currentStepIndex}
            />
          ))}
        </div>

        {/* Rotating Educational Tips */}
        <div
          className="p-4 bg-secondary rounded border border-border"
          key={tipIndex}
        >
          <div className="flex items-center gap-3 animate-fadeIn">
            <span className="text-2xl flex-shrink-0">{currentTip.emoji}</span>
            <p className="text-sm text-muted text-left">{currentTip.text}</p>
          </div>
        </div>

        {/* Tip indicator dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {tips.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                index === tipIndex ? "bg-primary w-4" : "bg-muted/40"
              }`}
            />
          ))}
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
    <div className="flex items-center gap-3 text-sm">
      <div
        className={`
          w-5 h-5 rounded flex items-center justify-center flex-shrink-0
          transition-all duration-300
          ${isComplete ? "bg-primary text-white" : ""}
          ${isActive ? "bg-primary/20 border-2 border-primary" : ""}
          ${!isComplete && !isActive ? "bg-secondary border border-border" : ""}
        `}
      >
        {isComplete && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {isActive && (
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        )}
      </div>
      <span
        className={`
          transition-colors duration-300
          ${isComplete ? "text-foreground" : ""}
          ${isActive ? "text-primary font-medium" : ""}
          ${!isComplete && !isActive ? "text-muted" : ""}
        `}
      >
        {label}
      </span>
    </div>
  );
}
