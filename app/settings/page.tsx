"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface UsageData {
  used: number;
  limit: number;
  resetTime: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/?signin=true");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      setUsage({
        used: 3,
        limit: 5,
        resetTime: "midnight",
      });
      setLoadingUsage(false);
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-secondary rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-36 bg-secondary rounded" />
              <div className="h-36 bg-secondary rounded" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isPro = false;
  const usagePercent = usage ? (usage.used / usage.limit) * 100 : 0;

  return (
    <main className="min-h-[calc(100vh-4rem)] p-4 md:px-8 md:py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header - Full width like nav */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/designs"
            className="p-1.5 -ml-1.5 rounded hover:bg-accent/5 transition-all duration-200 text-muted hover:text-accent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>

        {/* Grid Layout - 2 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account Card */}
          <div className="bg-surface rounded border border-border p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-accent/10 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-sm font-semibold text-foreground">Account</h2>
            </div>
            <p className="text-xs text-muted mb-1">Email</p>
            <p className="text-sm font-medium text-foreground truncate mb-3">{user.email}</p>
            
            {/* Current Plan Tag */}
            <div className="mt-auto">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Current Plan: {isPro ? "Pro" : "Free"}
              </span>
            </div>
          </div>

          {/* Usage Card */}
          <div className="bg-surface rounded border border-orange/30 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange/10 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-foreground">Daily Usage</h2>
              </div>
              {/* Percentage Badge */}
              {usage && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  usagePercent >= 100 ? 'bg-destructive/15 text-destructive' : 'bg-orange/15 text-orange'
                }`}>
                  {Math.round(usagePercent)}%
                </span>
              )}
            </div>
            {loadingUsage ? (
              <div className="animate-pulse h-4 bg-secondary rounded" />
            ) : usage && (
              <>
                <p className="text-lg font-bold mb-2">
                  <span className="text-orange">{usage.used}</span>
                  <span className="text-muted text-sm font-normal"> / {usage.limit}</span>
                </p>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent >= 100 ? 'bg-destructive' : 'bg-orange'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-1">Resets at {usage.resetTime}</p>
              </>
            )}
          </div>
        </div>

        {/* Upgrade Banner - Full width */}
        {!isPro && (
          <div className="mt-4 bg-surface rounded border border-orange/30 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange/15 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Upgrade to Pro</p>
                  <p className="text-xs text-muted">25 generations/day • $12/month</p>
                </div>
              </div>
              <button 
                className="px-4 py-2 bg-orange text-white text-sm font-semibold rounded shadow-sm hover:bg-orange-hover active:scale-[0.98] transition-all"
                onClick={() => alert("Stripe checkout coming soon!")}
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
