"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import RegenerateConfirmModal from "@/components/RegenerateConfirmModal";
import VariantCard from "@/components/VariantCard";
import Toast from "@/components/Toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/components/AuthProvider";

interface Variant {
  id: string;
  variant_number: number;
  batch_number?: number;
  strategy: string;
  image_url: string;
  recommended_background: 'light' | 'dark';
}

interface Project {
  id: string;
  name: string;
  original_image_url: string;
  created_at: string;
  user_id: string;
  variants: Variant[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Track which batch is currently selected/viewed
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  
  // Ref to prevent duplicate fetches
  const hasFetchedRef = useRef(false);
  const lastFetchedIdRef = useRef<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/?signin=true");
    }
  }, [user, authLoading, router]);

  // Fetch project - use useCallback to prevent recreation on every render
  const fetchProject = useCallback(async (forceRefresh = false) => {
    if (!id) return;
    
    // Skip if already fetched this project (unless force refresh)
    if (!forceRefresh && hasFetchedRef.current && lastFetchedIdRef.current === id) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        hasFetchedRef.current = true;
        lastFetchedIdRef.current = id;
      } else if (response.status === 404) {
        router.push("/designs");
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  // Reset fetch tracking when project id changes
  useEffect(() => {
    if (id !== lastFetchedIdRef.current) {
      hasFetchedRef.current = false;
    }
  }, [id]);

  // Fetch project only once when user is authenticated and id is available
  useEffect(() => {
    if (user && id && !hasFetchedRef.current) {
      fetchProject();
    }
  }, [user, id, fetchProject]);

  // Select the newest batch when project loads
  useEffect(() => {
    if (project?.variants && project.variants.length > 0 && selectedBatch === null) {
      const batchNumbers = project.variants.map((v: Variant) => v.batch_number || 1);
      const newestBatch = Math.max(...batchNumbers);
      setSelectedBatch(newestBatch);
    }
  }, [project, selectedBatch]);

  const handleSelectionChange = (variantId: string, selected: boolean) => {
    setSelectedVariants(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(variantId);
      } else {
        next.delete(variantId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (project && selectedBatch !== null) {
      const batchVariants = project.variants.filter(v => (v.batch_number || 1) === selectedBatch);
      setSelectedVariants(new Set(batchVariants.map(v => v.id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedVariants(new Set());
  };

  const handleFavoriteToggle = (variantId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(variantId)) {
        next.delete(variantId);
      } else {
        next.add(variantId);
      }
      return next;
    });
  };

  const handleBulkDownload = async () => {
    if (!project) return;
    
    const variantsToDownload = project.variants.filter(v => selectedVariants.has(v.id));
    
    for (const variant of variantsToDownload) {
      try {
        const response = await fetch(variant.image_url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `variant-${variant.variant_number}-${variant.strategy.toLowerCase().replace(/\s+/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error('Download error:', error);
      }
    }
    
    setToast({ message: `Downloaded ${variantsToDownload.length} variants`, type: "success" });
    setSelectedVariants(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    // For now, just show a toast - actual implementation would require API support
    setToast({ message: "Bulk delete coming soon", type: "info" });
  };

  const handleRegenerate = async () => {
    if (!project || isRegenerating) return;
    
    setIsRegenerating(true);
    setShowRegenerateModal(false);
    setToast({ message: "Generating new variants... This may take 1-2 minutes.", type: "info" });
    
    try {
      const response = await fetch(`/api/projects/${project.id}/regenerate`, {
        method: 'POST',
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Regeneration failed:', result);
        throw new Error(result.error || 'Failed to regenerate');
      }
      
      // Refresh project data to show new variants (force refresh)
      await fetchProject(true);
      
      // Select the new batch
      setSelectedBatch(result.batchNumber);
      
      setToast({ 
        message: `✨ Created ${result.variantCount} new variants in Variant ${result.batchNumber}!`, 
        type: "success" 
      });
    } catch (error) {
      console.error('Regeneration error:', error);
      setToast({ 
        message: error instanceof Error ? error.message : "Failed to regenerate variants", 
        type: "error" 
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }

      // Redirect to library
      router.push('/designs');
      router.refresh();
    } catch (error) {
      console.error('Delete error:', error);
      setIsDeleting(false);
      setToast({ message: "Failed to delete project", type: "error" });
    }
  };

  if (authLoading || isLoading || !project) {
    return (
      <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8 flex flex-col">
        <div className="max-w-6xl mx-auto w-full flex-1">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-secondary rounded" />
              <div className="h-8 bg-secondary rounded w-48" />
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-48 space-y-4">
                <div className="aspect-square bg-secondary rounded" />
                <div className="h-10 bg-secondary rounded" />
                <div className="space-y-2">
                  <div className="h-12 bg-secondary rounded" />
                  <div className="h-12 bg-secondary rounded" />
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-square bg-secondary rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Show regeneration loading screen
  if (isRegenerating) {
    const existingBatches = project.variants?.map(v => v.batch_number || 1) || [1];
    const nextBatch = Math.max(...existingBatches) + 1;
    
    return (
      <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8 flex flex-col items-center justify-center">
        <LoadingSpinner
          message="Generating new variants..."
          subMessage={`Creating Variant ${nextBatch} for "${project.name}"`}
          imagePreview={project.original_image_url}
          estimatedTime={90}
        />
      </main>
    );
  }

  // Group variants by batch_number
  const variantsByBatch = project.variants.reduce((acc, variant) => {
    const batch = variant.batch_number || 1;
    if (!acc[batch]) {
      acc[batch] = [];
    }
    acc[batch].push(variant);
    return acc;
  }, {} as Record<number, Variant[]>);

  // Sort batches in descending order (newest first)
  const sortedBatches = Object.keys(variantsByBatch)
    .map(Number)
    .sort((a, b) => b - a);
  
  // Sort variants within each batch
  sortedBatches.forEach(batch => {
    variantsByBatch[batch].sort((a, b) => a.variant_number - b.variant_number);
  });

  // Get current batch variants
  const currentBatchVariants = selectedBatch !== null ? variantsByBatch[selectedBatch] || [] : [];
  const isNewestBatch = selectedBatch === Math.max(...sortedBatches);

  // Format date
  const formattedDate = new Date(project.created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <main className="min-h-[calc(100vh-4rem)] p-4 md:p-6 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/designs"
              className="p-1.5 -ml-1.5 rounded hover:bg-accent/5 transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center text-muted hover:text-accent"
              title="Back to library"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-primary">{project.name}</h1>
              <p className="text-muted text-xs mt-0.5">{formattedDate}</p>
            </div>
          </div>
          
          {/* Three-dot menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded hover:bg-accent/5 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="More options"
            >
              <svg className="w-5 h-5 text-muted hover:text-accent" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1 w-52 bg-surface rounded shadow-lg border border-border overflow-hidden z-50 animate-slideDown">
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsSelectionMode(!isSelectionMode);
                        setSelectedVariants(new Set());
                      }}
                      className="flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded hover:bg-accent/5 transition-colors text-foreground/80"
                    >
                      <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span className="font-medium">Select Multiple</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowRegenerateModal(true);
                      }}
                      disabled={isRegenerating}
                      className="flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded hover:bg-accent/5 transition-colors text-foreground/80 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="font-medium">Regenerate</span>
                    </button>
                    
                    <div className="my-1 mx-2.5 border-t border-border" />
                    
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteModal(true);
                      }}
                      className="flex items-center gap-2 w-full px-2.5 py-2 text-sm rounded hover:bg-destructive/10 transition-colors text-destructive"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="font-medium">Delete Project</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Content - Sidebar Layout */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0 space-y-4">
            {/* Source Preview */}
            <div className="bg-surface rounded border border-border p-3 md:p-3">
              <div className="flex items-center justify-between md:block">
                <p className="text-xs font-bold text-foreground md:mb-3">Source</p>
                {/* Mobile: Just show the link tag inline */}
                <button
                  onClick={() => window.open(project.original_image_url, '_blank')}
                  className="md:hidden flex items-center gap-1.5 py-1 px-2 text-xs font-medium bg-accent/10 text-accent rounded hover:bg-accent/15 transition-colors"
                >
                  <span>original upload</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
              {/* Desktop: Show image and button */}
              <div className="hidden md:block">
                <div className="relative aspect-square bg-white rounded overflow-hidden border border-border mb-3">
                  <Image
                    src={project.original_image_url}
                    alt="Original design"
                    fill
                    loading="lazy"
                    className="object-contain p-2"
                    sizes="192px"
                  />
                </div>
                <button
                  onClick={() => window.open(project.original_image_url, '_blank')}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium bg-accent/10 text-accent rounded hover:bg-accent/15 transition-colors"
                >
                  <span>original upload</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Generations */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-foreground">Generations</p>
              {sortedBatches.map((batchNumber) => {
                const batchVariants = variantsByBatch[batchNumber];
                const isSelected = selectedBatch === batchNumber;
                const isBatchNewest = batchNumber === Math.max(...sortedBatches);
                
                return (
                  <button
                    key={batchNumber}
                    onClick={() => setSelectedBatch(batchNumber)}
                    className={`
                      w-full flex items-center justify-between py-2.5 px-3 rounded border text-left transition-all duration-200
                      ${isSelected 
                        ? 'bg-accent/10 border-accent/30 text-foreground' 
                        : 'bg-surface border-border text-muted hover:border-accent/20 hover:text-foreground'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${isSelected ? 'text-foreground' : ''}`}>
                        Variant {batchNumber}
                      </span>
                      <span className="text-xs text-muted">{batchVariants.length} designs</span>
                    </div>
                    {isBatchNewest && sortedBatches.length > 1 && (
                      <span className="px-1.5 py-0.5 bg-orange/15 text-orange text-xs font-medium rounded">
                        New
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Selection Mode Cancel */}
            {isSelectionMode && (
              <div className="flex items-center justify-end mb-4">
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedVariants(new Set());
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium text-muted hover:text-foreground hover:bg-secondary/80 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </div>
            )}

            {/* Variant Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {currentBatchVariants.map((variant) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  projectId={project.id}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedVariants.has(variant.id)}
                  onSelectionChange={handleSelectionChange}
                  isFavorite={favorites.has(variant.id)}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>

            {/* Empty state if no variants in current batch */}
            {currentBatchVariants.length === 0 && (
              <div className="text-center py-12 text-muted">
                <p>No designs in this variant.</p>
              </div>
            )}
          </div>
        </div>

        {/* Spacer for bottom action bar */}
        {isSelectionMode && <div className="h-24" />}
      </div>

      {/* Fixed Bottom Action Bar */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          transform transition-transform duration-300 ease-out
          ${isSelectionMode ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        <div className="bg-surface/95 backdrop-blur-md border-t border-border">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left side - Selection info */}
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground text-sm">
                  {selectedVariants.size} selected
                </span>
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-1 text-sm text-muted hover:text-accent hover:bg-accent/5 rounded transition-all duration-200 font-medium"
                  >
                    Select all
                  </button>
                  <span className="text-muted">•</span>
                  <button
                    onClick={handleDeselectAll}
                    className="px-2 py-1 text-sm text-muted hover:text-accent hover:bg-accent/5 rounded transition-all duration-200 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Right side - Actions */}
              <div className="flex items-center gap-2">
                {/* Cancel button */}
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedVariants(new Set());
                  }}
                  className="px-3 py-2 rounded text-sm font-medium text-muted hover:text-foreground hover:bg-secondary transition-all duration-200"
                >
                  Cancel
                </button>

                {/* Delete button */}
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedVariants.size === 0}
                  className={`
                    px-3 py-2 rounded text-sm font-medium
                    transition-all duration-200
                    flex items-center gap-1.5
                    ${selectedVariants.size === 0
                      ? 'text-muted cursor-not-allowed'
                      : 'text-destructive hover:bg-destructive/10'
                    }
                  `}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Delete</span>
                </button>

                {/* Download button */}
                <button
                  onClick={handleBulkDownload}
                  disabled={selectedVariants.size === 0}
                  className={`
                    px-3 py-1.5 rounded text-sm font-medium
                    transition-all duration-200
                    flex items-center gap-1.5
                    ${selectedVariants.size === 0
                      ? 'bg-secondary text-muted cursor-not-allowed'
                      : 'bg-accent text-white shadow-sm hover:shadow-md hover:bg-accent/90 active:scale-[0.98]'
                    }
                  `}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">Download</span>
                  <span className="sm:hidden">Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        projectName={project.name}
      />

      {/* Regenerate Confirmation Modal */}
      <RegenerateConfirmModal
        isOpen={showRegenerateModal}
        onClose={() => setShowRegenerateModal(false)}
        onConfirm={handleRegenerate}
        isRegenerating={isRegenerating}
        currentBatchCount={sortedBatches.length}
      />
    </main>
  );
}
