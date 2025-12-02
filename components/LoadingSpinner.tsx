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
      {/* Container Card with subtle brand gradient border */}
      <div className="relative bg-white rounded-lg p-6 md:p-8 shadow-xl text-center max-w-lg w-full overflow-hidden">
        {/* Animated gradient border effect */}
        <div 
          className="absolute inset-0 rounded-lg opacity-30"
          style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #f97316 50%, #0f766e 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 3s ease infinite',
            padding: '2px',
          }}
        />
        <div className="absolute inset-[2px] bg-white rounded-lg" />
        
        {/* Content wrapper */}
        <div className="relative z-10">
          {/* AI Analysis Visualization */}
          {imagePreview && (
            <div className="relative w-40 h-40 md:w-48 md:h-48 mx-auto mb-8">
              {/* Outer glow rings */}
              <div 
                className="absolute -inset-4 rounded-lg opacity-20"
                style={{
                  background: 'radial-gradient(circle, #0f766e 0%, transparent 70%)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <div 
                className="absolute -inset-2 rounded-lg opacity-15"
                style={{
                  background: 'radial-gradient(circle, #f97316 0%, transparent 70%)',
                  animation: 'pulse 2s ease-in-out infinite 0.5s',
                }}
              />
              
              {/* Image Preview */}
              <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl border-2 border-accent/20">
                <img
                  src={imagePreview}
                  alt="Analyzing..."
                  className="w-full h-full object-contain bg-gradient-to-br from-secondary to-white"
                />
                
                {/* Multiple scan lines for more dynamic effect */}
                <div className="absolute inset-0 overflow-hidden">
                  {/* Primary scan line - green to orange */}
                  <div 
                    className="absolute inset-x-0 h-1.5"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, #0f766e 30%, #f97316 70%, transparent 100%)',
                      boxShadow: '0 0 20px #0f766e, 0 0 40px #f97316',
                      animation: 'scan 2s ease-in-out infinite',
                    }}
                  />
                  {/* Secondary scan line - orange to green (offset) */}
                  <div 
                    className="absolute inset-x-0 h-0.5 opacity-60"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, #f97316 30%, #0f766e 70%, transparent 100%)',
                      boxShadow: '0 0 10px #f97316',
                      animation: 'scan 2s ease-in-out infinite 1s',
                    }}
                  />
                </div>
                
                {/* Corner Brackets - alternating green and orange */}
                <div className="absolute top-2 left-2 w-5 h-5 border-l-[3px] border-t-[3px] border-accent rounded-tl-sm" />
                <div className="absolute top-2 right-2 w-5 h-5 border-r-[3px] border-t-[3px] border-orange rounded-tr-sm" />
                <div className="absolute bottom-2 left-2 w-5 h-5 border-l-[3px] border-b-[3px] border-orange rounded-bl-sm" />
                <div className="absolute bottom-2 right-2 w-5 h-5 border-r-[3px] border-b-[3px] border-accent rounded-br-sm" />
                
                {/* Subtle grid overlay */}
                <div 
                  className="absolute inset-0 opacity-5"
                  style={{
                    backgroundImage: 'linear-gradient(#0f766e 1px, transparent 1px), linear-gradient(90deg, #0f766e 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />
              </div>
              
              {/* Analysis Label with gradient */}
              <div 
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #f97316 100%)',
                }}
              >
                <span className="text-xs font-semibold text-white whitespace-nowrap tracking-wide">
                  {analysisSteps[currentStepIndex]?.label || "Processing..."}
                </span>
              </div>
            </div>
          )}

          {/* Spinner (shown when no preview) - branded colors */}
          {!imagePreview && (
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-secondary rounded-full"></div>
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{ 
                  borderWidth: '4px',
                  borderStyle: 'solid',
                  borderColor: 'transparent',
                  borderTopColor: '#0f766e',
                  borderRightColor: '#f97316',
                  animationDuration: "1.2s" 
                }}
              ></div>
              {/* Inner pulse with gradient */}
              <div 
                className="absolute inset-4 rounded-full animate-pulse"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.2) 0%, rgba(249, 115, 22, 0.2) 100%)',
                }}
              />
            </div>
          )}

          {/* Message */}
          <h2 className="text-xl font-bold mb-2 text-foreground">{message}</h2>

          {/* Countdown Timer */}
          <div className="mb-5">
            <p className="text-3xl font-bold mb-1">
              <span className="bg-gradient-to-r from-accent to-orange bg-clip-text text-transparent">
                ~{timeRemaining}s
              </span>
              <span className="text-sm font-normal text-muted ml-2">remaining</span>
            </p>
            <p className="text-xs text-muted">{subMessage || "Faster than making coffee ☕"}</p>
          </div>

          {/* Progress Bar with gradient */}
          <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden mb-6">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #0f766e 0%, #14b8a6 50%, #f97316 100%)',
              }}
            />
          </div>

          {/* Progress Steps */}
          <div className="space-y-2.5 text-left mb-6">
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
            className="p-4 rounded-lg border border-accent/20"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.05) 0%, rgba(249, 115, 22, 0.05) 100%)',
            }}
            key={tipIndex}
          >
            <div className="flex items-center gap-3 animate-fadeIn">
              <span className="text-2xl flex-shrink-0">{currentTip.emoji}</span>
              <p className="text-sm text-muted text-left">{currentTip.text}</p>
            </div>
          </div>

          {/* Tip indicator dots */}
          <div className="flex justify-center gap-2 mt-4">
            {tips.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === tipIndex 
                    ? "w-6" 
                    : "w-1.5 bg-muted/30"
                }`}
                style={index === tipIndex ? {
                  background: 'linear-gradient(90deg, #0f766e, #f97316)',
                } : undefined}
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
    <div className="flex items-center gap-3 text-sm">
      <div
        className={`
          w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
          transition-all duration-300
          ${!isComplete && !isActive ? "bg-secondary border border-border" : ""}
        `}
        style={isComplete ? {
          background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
        } : isActive ? {
          background: 'rgba(249, 115, 22, 0.15)',
          border: '2px solid #f97316',
        } : undefined}
      >
        {isComplete && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {isActive && (
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#f97316' }}
          />
        )}
      </div>
      <span
        className={`
          transition-colors duration-300
          ${isComplete ? "text-accent font-medium" : ""}
          ${isActive ? "text-orange font-semibold" : ""}
          ${!isComplete && !isActive ? "text-muted" : ""}
        `}
      >
        {label}
      </span>
    </div>
  );
}
