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

interface PrintifyStatus {
  connected: boolean;
  shops?: {
    id: string;
    name: string;
    salesChannel?: string;
    isDefault?: boolean;
  }[];
  defaultShopId?: string;
  connectedAt?: string;
}

interface PrintifyShopOption {
  id: string;
  name: string;
  salesChannel?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  
  // Printify state
  const [printifyStatus, setPrintifyStatus] = useState<PrintifyStatus>({ connected: false });
  const [loadingPrintify, setLoadingPrintify] = useState(true);
  const [showApiTokenInput, setShowApiTokenInput] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [fetchingShops, setFetchingShops] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [availableShops, setAvailableShops] = useState<PrintifyShopOption[]>([]);
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [defaultShopId, setDefaultShopId] = useState<string>("");

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
      
      // Fetch Printify status
      fetchPrintifyStatus();
    }
  }, [user]);

  const fetchPrintifyStatus = async () => {
    try {
      const response = await fetch("/api/integrations/printify/status");
      const data = await response.json();
      setPrintifyStatus(data);
    } catch (error) {
      console.error("Failed to fetch Printify status:", error);
    } finally {
      setLoadingPrintify(false);
    }
  };

  const handleFetchShops = async () => {
    if (!apiToken.trim()) {
      setConnectError("Please enter your API token");
      return;
    }

    setFetchingShops(true);
    setConnectError("");

    try {
      const response = await fetch("/api/integrations/printify/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch stores");
      }

      setAvailableShops(data.shops || []);
      const initialIds = (data.shops || []).map((s: any) => s.id?.toString()).filter(Boolean);
      setSelectedShopIds(initialIds);
      setDefaultShopId(initialIds[0] || "");

      if (!data.shops?.length) {
        setConnectError("No stores found on this Printify account.");
      }
    } catch (error) {
      setAvailableShops([]);
      setSelectedShopIds([]);
      setDefaultShopId("");
      setConnectError(error instanceof Error ? error.message : "Failed to fetch stores");
    } finally {
      setFetchingShops(false);
    }
  };

  const handleConnectPrintify = async () => {
    if (!apiToken.trim()) {
      setConnectError("Please enter your API token");
      return;
    }

    if (!selectedShopIds.length) {
      setConnectError("Please fetch and select at least one store to connect");
      return;
    }

    if (!defaultShopId) {
      setConnectError("Please choose a default store");
      return;
    }

    setConnecting(true);
    setConnectError("");

    try {
      const response = await fetch("/api/integrations/printify/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken, shopIds: selectedShopIds, defaultShopId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect");
      }

      setPrintifyStatus({
        connected: true,
        shops: data.shops,
        defaultShopId: data.defaultShop?.id || defaultShopId,
      });
      setShowApiTokenInput(false);
      setApiToken("");
      setAvailableShops([]);
      setSelectedShopIds([]);
      setDefaultShopId("");
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectPrintify = async () => {
    if (!confirm("Are you sure you want to disconnect Printify?")) return;

    try {
      await fetch("/api/integrations/printify/disconnect", {
        method: "POST",
      });
      setPrintifyStatus({ connected: false });
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

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
          <h1 className="text-xl font-bold text-primary">Settings</h1>
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
              <h2 className="text-sm font-semibold text-primary">Account</h2>
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
                <h2 className="text-sm font-semibold text-primary">Daily Usage</h2>
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

        {/* Integrations Section */}
        <div className="mt-6">
          <h2 className="text-sm font-bold text-primary mb-3">Integrations</h2>
          
          {/* Printify Card */}
          <div className="bg-surface rounded border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Printify Logo */}
                <div className="w-10 h-10 bg-[#29b474]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#29b474]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Printify</h3>
                  <p className="text-xs text-muted">Create & sell print-on-demand products</p>
                </div>
              </div>
              
              {loadingPrintify ? (
                <div className="animate-pulse h-8 w-24 bg-secondary rounded" />
              ) : printifyStatus.connected ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {printifyStatus.shops?.find((s) => s.id === printifyStatus.defaultShopId)?.name || "Connected"}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {printifyStatus.shops?.length ? `${printifyStatus.shops.length} store${printifyStatus.shops.length > 1 ? "s" : ""}` : "Connected"}
                    </p>
                  </div>
                  <button
                    onClick={handleDisconnectPrintify}
                    className="px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setShowApiTokenInput(true);
                    setAvailableShops([]);
                    setSelectedShopIds([]);
                    setDefaultShopId("");
                    setConnectError("");
                  }}
                  disabled={loadingPrintify}
                  className="px-4 py-2 bg-[#29b474] text-white text-sm font-semibold rounded shadow-sm hover:bg-[#24a066] active:scale-[0.98] transition-all"
                >
                  Connect
                </button>
              )}
            </div>

            {/* API Token Input */}
            {showApiTokenInput && !printifyStatus.connected && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="space-y-3">
                  <div>
                    <label htmlFor="apiToken" className="block text-sm font-medium text-foreground mb-1">
                      Printify API Token
                    </label>
                    <p className="text-xs text-muted mb-2">
                      Get your API token from{" "}
                      <a 
                        href="https://printify.com/app/account/api" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        Printify Settings → API
                      </a>
                    </p>
                    <input
                      type="password"
                      id="apiToken"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      placeholder="Enter your API token"
                      className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                  
                  {availableShops.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted">Select which Printify stores to connect and choose a default:</p>
                      <div className="space-y-2">
                        {availableShops.map((shop) => {
                          const id = shop.id.toString();
                          const isSelected = selectedShopIds.includes(id);
                          const isDefault = defaultShopId === id;
                          
                          return (
                            <div
                              key={id}
                              className={`border rounded px-3 py-2 transition-colors ${
                                isSelected ? "border-[#29b474] bg-[#29b474]/5" : "border-border hover:border-[#29b474]/60"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedShopIds((prev) => {
                                      if (prev.includes(id)) {
                                        const next = prev.filter((v) => v !== id);
                                        // if default was removed, clear default
                                        if (defaultShopId === id) {
                                          setDefaultShopId(next[0] || "");
                                        }
                                        return next;
                                      }
                                      const next = [...prev, id];
                                      if (!defaultShopId) {
                                        setDefaultShopId(id);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="text-[#29b474] focus:ring-[#29b474]"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground">{shop.name}</p>
                                  {shop.salesChannel && (
                                    <p className="text-xs text-muted capitalize">{shop.salesChannel}</p>
                                  )}
                                </div>
                                <label className="flex items-center gap-1 text-xs text-muted">
                                  <input
                                    type="radio"
                                    name="default-shop"
                                    value={id}
                                    disabled={!isSelected}
                                    checked={isDefault}
                                    onChange={() => setDefaultShopId(id)}
                                    className="text-[#29b474] focus:ring-[#29b474]"
                                  />
                                  Default
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {connectError && (
                    <p className="text-sm text-destructive">{connectError}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleFetchShops}
                      disabled={fetchingShops || connecting}
                      className="px-4 py-2 bg-secondary text-foreground text-sm font-semibold rounded shadow-sm hover:bg-secondary/80 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {fetchingShops ? "Fetching stores..." : "Fetch stores"}
                    </button>
                    <button
                      onClick={handleConnectPrintify}
                      disabled={connecting || !selectedShopIds.length || !defaultShopId || fetchingShops}
                      className="px-4 py-2 bg-[#29b474] text-white text-sm font-semibold rounded shadow-sm hover:bg-[#24a066] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {connecting ? "Connecting..." : "Connect"}
                    </button>
                    <button
                      onClick={() => {
                        setShowApiTokenInput(false);
                        setApiToken("");
                        setConnectError("");
                        setAvailableShops([]);
                        setSelectedShopIds([]);
                        setDefaultShopId("");
                      }}
                      className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Connected Features */}
            {printifyStatus.connected && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted mb-2">Available features:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-secondary text-xs text-foreground rounded">T-Shirts</span>
                  <span className="px-2 py-1 bg-secondary text-xs text-foreground rounded">Hoodies</span>
                  <span className="px-2 py-1 bg-secondary text-xs text-foreground rounded">Mugs</span>
                  <span className="px-2 py-1 bg-secondary text-xs text-foreground rounded">Canvas</span>
                  <span className="px-2 py-1 bg-secondary text-xs text-foreground rounded">+100 more</span>
                </div>
              </div>
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
                  <p className="font-semibold text-sm text-primary">Upgrade to Pro</p>
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
