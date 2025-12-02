"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

const PENDING_PROJECT_KEY = "pod-remix-pending-project";

interface PendingProject {
  originalImage: string;
  variants: Array<{
    id: number;
    strategy: string;
    design: {
      imageData: string;
      imageUrl?: string;
    };
    colorClassification?: {
      recommendedBackground: 'light' | 'dark';
    };
  }>;
  createdAt: string;
}

interface SaveDesignsCTAProps {
  onSuccess?: () => void;
  variant?: "default" | "compact";
  pendingProjectData?: PendingProject | null;
}

export default function SaveDesignsCTA({ onSuccess, variant = "default", pendingProjectData }: SaveDesignsCTAProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Store pending project data whenever it changes
  useEffect(() => {
    if (pendingProjectData) {
      localStorage.setItem(PENDING_PROJECT_KEY, JSON.stringify(pendingProjectData));
    }
  }, [pendingProjectData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      // Make sure pending project is stored before sending magic link
      if (pendingProjectData) {
        localStorage.setItem(PENDING_PROJECT_KEY, JSON.stringify(pendingProjectData));
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?transfer=true`,
        },
      });

      if (error) {
        throw error;
      }

      setStatus("success");
      onSuccess?.();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (status === "success") {
    return (
      <div className="bg-secondary/50 border border-border rounded-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/10 rounded-sm flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-foreground">
            Check your inbox! We sent a link to <strong>{email}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary/50 border border-border rounded-sm p-4">
      {variant === "compact" ? (
        // Compact: Just email input with Save inside
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email to save your edits"
              required
              className="
                w-full
                pl-3 pr-16 py-2
                text-sm
                bg-white dark:bg-gray-900
                border border-border
                rounded-sm
                focus:outline-none focus:border-primary
                placeholder:text-muted/40
                transition-colors
              "
            />
            <button
              type="submit"
              disabled={isLoading}
              className="
                absolute right-1 top-1/2 -translate-y-1/2
                px-3 py-1
                text-sm font-semibold
                text-orange hover:text-orange-hover
                disabled:opacity-50
                transition-colors
              "
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin text-orange" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                "Save"
              )}
            </button>
          </div>
          {status === "error" && errorMessage && (
            <p className="mt-1.5 text-xs text-red-500">{errorMessage}</p>
          )}
        </form>
      ) : (
        // Default: Text label + email input
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-muted flex-shrink-0">
            Save these designs
          </p>
          <form onSubmit={handleSubmit} className="flex-1">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="
                  w-full
                  pl-3 pr-16 py-2
                  text-sm
                  bg-white dark:bg-gray-900
                  border border-border
                  rounded-sm
                  focus:outline-none focus:border-primary
                  placeholder:text-muted/40
                  transition-colors
                "
              />
              <button
                type="submit"
                disabled={isLoading}
                className="
                  absolute right-1 top-1/2 -translate-y-1/2
                  px-3 py-1
                  text-sm font-semibold
                  text-orange hover:text-orange-hover
                  disabled:opacity-50
                  transition-colors
                "
              >
                {isLoading ? (
                  <svg className="w-4 h-4 animate-spin text-orange" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  "Save"
                )}
              </button>
            </div>
            {status === "error" && errorMessage && (
              <p className="mt-1.5 text-xs text-red-500">{errorMessage}</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

