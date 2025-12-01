"use client";

import { useEffect, useState, useRef } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
  action?: ToastAction;
  secondaryAction?: ToastAction;
}

export default function Toast({
  message,
  type = "success",
  duration = 4000,
  onClose,
  action,
  secondaryAction,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startXRef = useRef(0);
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isDragging) {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose, isDragging]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const currentX = e.touches[0].clientX;
      const diff = currentX - startXRef.current;
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (Math.abs(dragOffset) > 100) {
      // Swiped enough to dismiss
      setIsVisible(false);
      setTimeout(onClose, 300);
    } else {
      setDragOffset(0);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const bgColor = {
    success: "bg-emerald-500",
    error: "bg-destructive",
    info: "bg-primary",
  }[type];

  const icon = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }[type];

  return (
    <div
      ref={toastRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`
        fixed z-50
        /* Mobile: top-center */
        top-20 left-4 right-4
        /* Desktop: bottom-right */
        md:top-auto md:bottom-6 md:left-auto md:right-6
        md:w-auto md:max-w-sm
        
        flex flex-col gap-2 px-4 py-3 rounded shadow-2xl
        ${bgColor} text-white
        transition-all duration-300 ease-out
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 md:translate-y-4 opacity-0"}
      `}
      style={{
        transform: isDragging
          ? `translateX(${dragOffset}px)`
          : undefined,
      }}
    >
      {/* Main content row */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{icon}</div>
        <span className="font-medium flex-1">{message}</span>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Action buttons row */}
      {(action || secondaryAction) && (
        <div className="flex gap-2 mt-1">
          {action && (
            <button
              onClick={() => {
                action.onClick();
                handleClose();
              }}
              className="
                flex-1 px-3 py-2
                bg-white/20 hover:bg-white/30
                rounded font-medium text-sm
                transition-colors
                min-h-[40px]
              "
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={() => {
                secondaryAction.onClick();
                handleClose();
              }}
              className="
                flex-1 px-3 py-2
                bg-white/10 hover:bg-white/20
                rounded font-medium text-sm
                transition-colors
                min-h-[40px]
              "
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {/* Swipe hint on mobile */}
      <div className="md:hidden absolute -bottom-6 left-1/2 -translate-x-1/2">
        <p className="text-xs text-white/50">Swipe to dismiss</p>
      </div>
    </div>
  );
}
