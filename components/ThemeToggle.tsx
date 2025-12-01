"use client";

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  // Start with null to avoid hydration mismatch
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    
    // Apply theme
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Don't render until we know the actual theme (prevents hydration mismatch)
  if (isDark === null) {
    return (
      <div className="fixed top-6 right-6 z-50 w-12 h-12" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="
        fixed top-6 right-6 z-50
        p-3
        bg-surface
        text-muted
        hover:text-primary
        rounded
        shadow-md
        hover:shadow-lg
        transition-smooth
        focus-ring
      "
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      // Suppress hydration warning for browser extension attributes
      suppressHydrationWarning
    >
      {isDark ? (
        // Sun icon
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        // Moon icon
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}







