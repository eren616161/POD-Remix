"use client";

import { useState, useEffect } from "react";

interface LoadingSpinnerProps {
  message?: string;
  subMessage?: string;
  imagePreview?: string;
  estimatedTime?: number; // in seconds
  variantCount?: number; // Number of variants being generated
}

// Educational tips that rotate during loading
const tips = [
  { emoji: "💡", text: "POD designs work best with high contrast for print quality" },
  { emoji: "🎨", text: "AI analyzes color harmony and composition for optimal variations" },
  { emoji: "📐", text: "Each variant explores different visual strategies to expand your catalog" },
  { emoji: "✨", text: "Bold, simple designs tend to sell better across all product types" },
  { emoji: "🚀", text: "Faster than making coffee! Your AI designs are brewing..." },
];

// Dynamic stage illustrations for the loading flow
const creationStages = [
  {
    id: 1,
    label: "Analyzing design",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" className="stroke-accent" strokeWidth="2" strokeDasharray="4 2" />
        <circle cx="16" cy="16" r="6" className="fill-accent/20" />
        <path d="M16 10V16L20 18" className="stroke-accent" strokeWidth="2" strokeLinecap="round" />
        <circle cx="22" cy="10" r="3" className="fill-orange" />
      </svg>
    ),
    description: "Finding colors & patterns",
  },
  {
    id: 2,
    label: "Creating variations",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="8" width="10" height="10" rx="2" className="fill-accent/30 stroke-accent" strokeWidth="1.5" />
        <rect x="18" y="8" width="10" height="10" rx="2" className="fill-orange/30 stroke-orange" strokeWidth="1.5" />
        <rect x="4" y="20" width="10" height="6" rx="1" className="fill-accent/20" />
        <rect x="18" y="20" width="10" height="6" rx="1" className="fill-orange/20" />
        <path d="M14 13h4" className="stroke-muted" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2">
          <animate attributeName="stroke-dashoffset" values="0;4" dur="0.5s" repeatCount="indefinite" />
        </path>
      </svg>
    ),
    description: "Generating unique styles",
  },
  {
    id: 3,
    label: "Rendering designs",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="6" width="20" height="20" rx="3" className="stroke-accent" strokeWidth="2" />
        <path d="M6 20l6-6 4 4 6-8 4 4" className="stroke-orange" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2" className="fill-orange" />
      </svg>
    ),
    description: "Crafting high-res images",
  },
  {
    id: 4,
    label: "Finalizing",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
        <path d="M8 16l6 6 10-12" className="stroke-accent" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="14" className="stroke-accent/30" strokeWidth="2" />
        <circle cx="26" cy="8" r="4" className="fill-orange animate-pulse" />
      </svg>
    ),
    description: "Ready for your store!",
  },
];

export default function LoadingSpinner({
  message,
  imagePreview,
  estimatedTime = 25,
  variantCount = 4,
}: LoadingSpinnerProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);

  // Default message with dynamic variant count
  const displayMessage = message || `Creating ${variantCount} design variations...`;

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Track elapsed time and progress
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const newTime = prev + 0.05;
        
        // Calculate progress with smoother, more realistic curve
        // Fast start, steady middle, slow finish
        const rawProgress = newTime / estimatedTime;
        let easedProgress;
        
        if (rawProgress < 0.3) {
          // Fast start (0-30%): quadratic ease-in
          easedProgress = Math.pow(rawProgress / 0.3, 1.5) * 30;
        } else if (rawProgress < 0.7) {
          // Steady middle (30-75%): linear
          easedProgress = 30 + ((rawProgress - 0.3) / 0.4) * 45;
        } else if (rawProgress < 1) {
          // Slow finish (75-92%): ease-out
          const t = (rawProgress - 0.7) / 0.3;
          easedProgress = 75 + (1 - Math.pow(1 - t, 2)) * 17;
        } else {
          // After estimated time, very slow creep (92-98%)
          const overTime = rawProgress - 1;
          easedProgress = 92 + Math.min(overTime * 3, 6);
        }
        
        setProgress(Math.min(98, easedProgress));
        
        // Update stage based on progress
        if (easedProgress < 20) setCurrentStage(0);
        else if (easedProgress < 50) setCurrentStage(1);
        else if (easedProgress < 80) setCurrentStage(2);
        else setCurrentStage(3);
        
        return newTime;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [estimatedTime]);

  const currentTip = tips[tipIndex];

  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-12">
      {/* Container Card */}
      <div className="relative bg-surface rounded-lg p-6 md:p-8 shadow-xl text-center max-w-lg w-full overflow-hidden border border-accent/10">
        
        {/* Content wrapper */}
        <div className="relative z-10 space-y-6">
          {/* Dynamic Stage Illustrations */}
          <div className="relative">
            {/* Stage icons in a horizontal flow */}
            <div className="flex items-center justify-center gap-2 md:gap-4 mb-4">
              {creationStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center">
                  {/* Stage icon */}
                  <div
                    className={`
                      relative w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center
                      transition-all duration-500
                      ${index === currentStage 
                        ? 'bg-accent/15 scale-110 shadow-lg ring-2 ring-accent/30' 
                        : index < currentStage 
                          ? 'bg-accent/10 opacity-70' 
                          : 'bg-secondary/50 opacity-40'
                      }
                    `}
                  >
                    <div className={`transition-all duration-300 ${index === currentStage ? 'scale-100' : 'scale-90'}`}>
                      {stage.icon}
                    </div>
                    
                    {/* Completed checkmark */}
                    {index < currentStage && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Active pulse */}
                    {index === currentStage && (
                      <div className="absolute inset-0 rounded-xl bg-accent/20 animate-ping" style={{ animationDuration: '2s' }} />
                    )}
                  </div>
                  
                  {/* Connector line */}
                  {index < creationStages.length - 1 && (
                    <div 
                      className={`
                        w-4 md:w-8 h-0.5 mx-1
                        transition-all duration-500
                        ${index < currentStage ? 'bg-accent' : 'bg-border'}
                      `}
                    />
                  )}
                </div>
              ))}
            </div>
            
            {/* Current stage label */}
            <div className="text-center">
              <p className="text-sm font-semibold text-accent">
                {creationStages[currentStage].label}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {creationStages[currentStage].description}
              </p>
            </div>
          </div>

          {/* Image Preview (if provided) */}
          {imagePreview && (
            <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto">
              <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg border-2 border-accent/20">
                <img
                  src={imagePreview}
                  alt="Processing..."
                  className="w-full h-full object-contain bg-secondary"
                />
                
                {/* Shimmer effect overlay */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={{
                    animation: 'shimmer 2s infinite',
                  }}
                />
                
                {/* Corner accents */}
                <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-accent rounded-tl" />
                <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-orange rounded-tr" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-orange rounded-bl" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-accent rounded-br" />
              </div>
            </div>
          )}

          {/* Spinner (shown when no preview) */}
          {!imagePreview && (
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-secondary rounded-full"></div>
              <div
                className="absolute inset-0 rounded-full animate-spin border-4 border-transparent border-t-accent"
                style={{ animationDuration: "1s" }}
              ></div>
              <div className="absolute inset-3 rounded-full animate-pulse bg-accent/10" />
            </div>
          )}

          {/* Message */}
          <h2 className="text-xl font-bold text-foreground">{displayMessage}</h2>

          {/* Progress Bar - Smooth and accurate */}
          <div className="space-y-2">
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200 ease-linear bg-gradient-to-r from-accent to-orange"
                style={{ 
                  width: `${progress}%`,
                  boxShadow: '0 0 10px rgba(249, 115, 22, 0.4)',
                }}
              />
            </div>
            <div className="flex justify-end items-center text-xs text-muted">
              <span className="font-medium text-accent">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Rotating Educational Tips */}
          <div
            className="p-3 rounded-lg border border-orange/20 bg-orange/5"
            key={tipIndex}
          >
            <div className="flex items-center gap-3 animate-fadeIn">
              <span className="text-xl flex-shrink-0">{currentTip.emoji}</span>
              <p className="text-sm text-muted text-left">{currentTip.text}</p>
            </div>
          </div>

          {/* Tip indicator dots */}
          <div className="flex justify-center gap-1.5">
            {tips.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === tipIndex 
                    ? "w-5 bg-orange" 
                    : "w-1.5 bg-muted/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* CSS for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
