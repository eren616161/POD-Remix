"use client";

import { useState } from "react";

export type FilterOption = "all" | "favorites";
export type ViewMode = "grid" | "list";

interface LibraryControlsProps {
  filterBy: FilterOption;
  viewMode: ViewMode;
  onFilterChange: (filter: FilterOption) => void;
  onViewModeChange: (mode: ViewMode) => void;
  totalCount?: number;
}

export default function LibraryControls({
  filterBy,
  viewMode,
  onFilterChange,
  onViewModeChange,
  totalCount,
}: LibraryControlsProps) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const filterOptions: { value: FilterOption; label: string; icon: React.ReactNode }[] = [
    { 
      value: "all", 
      label: "All Projects",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    { 
      value: "favorites", 
      label: "My Favorites",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    },
  ];

  const currentFilterLabel = filterOptions.find(opt => opt.value === filterBy)?.label || "Filter";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      {/* Left side: Filter only - No title label */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="
              flex items-center gap-2 px-3 py-2
              -ml-3
              rounded
              text-muted hover:text-foreground
              hover:bg-secondary/80
              transition-all duration-200
              text-sm font-medium
            "
          >
            {filterBy === 'favorites' ? (
              <svg className="w-4 h-4 text-orange" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            )}
            <span>{currentFilterLabel}</span>
            <svg className={`w-4 h-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showFilterDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowFilterDropdown(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-48 bg-surface rounded shadow-lg border border-border overflow-hidden z-50 animate-slideDown">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onFilterChange(option.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`
                      w-full px-3 py-2.5 text-left text-sm
                      hover:bg-accent/5 transition-colors
                      flex items-center justify-between gap-2
                      ${filterBy === option.value ? 'text-accent font-medium bg-accent/5' : 'text-foreground/80'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className={filterBy === option.value ? 'text-accent' : 'text-muted'}>{option.icon}</span>
                      {option.label}
                    </div>
                    {filterBy === option.value && (
                      <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side: View toggle */}
      <div className="flex items-center gap-0.5 p-1 bg-secondary/50 rounded">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`
            p-1.5 rounded transition-all duration-200
            ${viewMode === "grid"
              ? "text-accent bg-surface shadow-sm"
              : "text-muted hover:text-foreground"
            }
          `}
          aria-label="Grid view"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`
            p-1.5 rounded transition-all duration-200
            ${viewMode === "list"
              ? "text-accent bg-surface shadow-sm"
              : "text-muted hover:text-foreground"
            }
          `}
          aria-label="List view"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
