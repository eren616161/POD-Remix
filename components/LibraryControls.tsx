"use client";

import { useState } from "react";

export type SortOption = "newest" | "oldest" | "name";
export type ViewMode = "grid" | "list";

interface LibraryControlsProps {
  sortBy: SortOption;
  viewMode: ViewMode;
  onSortChange: (sort: SortOption) => void;
  onViewModeChange: (mode: ViewMode) => void;
  totalCount?: number;
}

export default function LibraryControls({
  sortBy,
  viewMode,
  onSortChange,
  onViewModeChange,
  totalCount,
}: LibraryControlsProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "name", label: "Name (A-Z)" },
  ];

  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label || "Sort";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      {/* Left side: Count and sort */}
      <div className="flex items-center gap-3">
        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            <span>{currentSortLabel}</span>
            <svg className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showSortDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSortDropdown(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-48 bg-surface rounded shadow-lg border border-border overflow-hidden z-50 animate-slideDown">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value);
                      setShowSortDropdown(false);
                    }}
                    className={`
                      w-full px-3 py-2.5 text-left text-sm
                      hover:bg-accent/5 transition-colors
                      flex items-center justify-between
                      ${sortBy === option.value ? 'text-accent font-medium bg-accent/5' : 'text-foreground/80'}
                    `}
                  >
                    {option.label}
                    {sortBy === option.value && (
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

      {/* Right side: View toggle - subtle utility control */}
      <div className="flex items-center gap-0.5 p-1 bg-secondary/50 rounded">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`
            p-1.5 rounded transition-all duration-200
            ${viewMode === "grid"
              ? "text-accent bg-white shadow-sm"
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
              ? "text-accent bg-white shadow-sm"
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
