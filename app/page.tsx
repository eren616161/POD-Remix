"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import UploadSection from "@/components/UploadSection";
import RemixGallery from "@/components/RemixGallery";
import LoadingSpinner from "@/components/LoadingSpinner";
import Toast from "@/components/Toast";
import AuthModal from "@/components/AuthModal";
import SaveDesignsCTA from "@/components/SaveDesignsCTA";
import { useAuth } from "@/components/AuthProvider";
import { saveProject } from "@/lib/project-actions";
import { type DesignAnalysis } from "@/lib/design-utils";
import { 
  getRemainingGenerations, 
  syncUsage, 
  hasReachedLimit,
  getDailyLimit 
} from "@/lib/usage-tracker";
import { generateDownloadFileName, downloadImage } from "@/lib/download-utils";

// Storage keys for cross-tab communication
const TRANSFER_COMPLETED_KEY = "pod-remix-transfer-completed";

// Lazy load DesignEditor - only loaded when user selects a variant to edit
// This reduces initial bundle size significantly (600+ lines component)
const DesignEditor = dynamic(
  () => import("@/components/DesignEditor"),
  { 
    loading: () => <LoadingSpinner message="Loading editor..." />,
    ssr: false 
  }
);

// State types
type AppState = "idle" | "uploading" | "processing" | "complete" | "editing" | "error";

interface DesignVersion {
  imageData: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  prompt: string;
}

interface ColorClassification {
  recommendedBackground: 'light' | 'dark';
  productHint: string;
}

interface Variant {
  id: number;
  strategy: string;
  design: DesignVersion;
  colorClassification?: ColorClassification;
}

interface ApiResponse {
  success: boolean;
  analysis: DesignAnalysis;
  variants: Variant[];
  remaining?: number | null;
}

function HomeContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [state, setState] = useState<AppState>("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [analysis, setAnalysis] = useState<DesignAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const saveAttemptedRef = useRef(false);
  
  // Track saved project for regeneration
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [currentBatch, setCurrentBatch] = useState(1);
  
  // Free tier usage tracking (only for non-authenticated users)
  const [remainingGenerations, setRemainingGenerations] = useState<number>(getDailyLimit());
  const [isAtLimit, setIsAtLimit] = useState(false);
  
  // Update remaining count on mount and when user changes
  useEffect(() => {
    if (!user) {
      setRemainingGenerations(getRemainingGenerations());
      setIsAtLimit(hasReachedLimit());
    } else {
      // Authenticated users have unlimited
      setRemainingGenerations(-1);
      setIsAtLimit(false);
    }
  }, [user]);

  // Check for auth redirect
  useEffect(() => {
    if (searchParams.get('signin') === 'true') {
      setShowAuthModal(true);
    }
    if (searchParams.get('error') === 'auth') {
      setToast({ message: "Authentication failed. Please try again.", type: "error" });
    }
  }, [searchParams]);

  // Check if a transfer was completed in another tab - clear state to prevent duplicates
  useEffect(() => {
    const checkTransferCompleted = () => {
      const transferCompleted = localStorage.getItem(TRANSFER_COMPLETED_KEY);
      if (transferCompleted && variants.length > 0) {
        // A transfer was completed, clear local state to prevent duplicate saves
        console.log('Transfer completed in another tab, clearing local state');
        localStorage.removeItem(TRANSFER_COMPLETED_KEY);
        handleReset();
      }
    };

    // Check on mount
    checkTransferCompleted();

    // Listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TRANSFER_COMPLETED_KEY && e.newValue) {
        checkTransferCompleted();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [variants.length]);

  // Auto-save project when variants are generated and user is logged in
  useEffect(() => {
    const autoSaveProject = async () => {
      if (saveAttemptedRef.current || state !== "complete" || variants.length === 0 || !user || !uploadPreview) {
        return;
      }

      // Check if a transfer was just completed - don't duplicate save
      const transferCompleted = localStorage.getItem(TRANSFER_COMPLETED_KEY);
      if (transferCompleted) {
        console.log('Transfer recently completed, skipping auto-save to prevent duplicates');
        localStorage.removeItem(TRANSFER_COMPLETED_KEY);
        return;
      }

      saveAttemptedRef.current = true;

      try {
        const nameResponse = await fetch("/api/generate-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: uploadPreview }),
        });

        let projectName = `Design ${new Date().toLocaleDateString()}`;
        if (nameResponse.ok) {
          const { name } = await nameResponse.json();
          projectName = name;
        }

        const result = await saveProject({
          userId: user.id,
          originalImage: uploadPreview,
          variants,
          projectName,
        });

        if (result.success && result.projectId) {
          setSavedProjectId(result.projectId);
          setCurrentBatch(1);
          setToast({ message: "Project saved to your library!", type: "success" });
        } else {
          console.error("Failed to save project:", result.error);
        }
      } catch (error) {
        console.error("Auto-save error:", error);
      }
    };

    autoSaveProject();
  }, [state, variants, user, uploadPreview]);

  const handleImageSelect = (file: File, preview: string) => {
    setUploadedFile(file);
    setUploadPreview(preview);
    setError(null);
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setState("processing");
    setError(null);
    saveAttemptedRef.current = false;

    try {
      const formData = new FormData();
      formData.append("image", uploadedFile);

      const response = await fetch("/api/remix", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate remixes";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
            
            // Handle rate limit error specifically
            if (errorData.error === 'daily_limit') {
              setIsAtLimit(true);
              setRemainingGenerations(0);
              throw new Error(errorData.message || "Daily limit reached. Sign up for unlimited access!");
            }
          } else {
            const errorText = await response.text();
            errorMessage = `Server error (${response.status}): ${response.statusText}`;
            console.error("Non-JSON error response:", errorText);
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes("Daily limit")) {
            throw parseError;
          }
          errorMessage = `Request failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data: ApiResponse = await response.json();
      
      // Sync usage tracking with server response
      if (data.remaining !== undefined && data.remaining !== null) {
        syncUsage(getDailyLimit() - data.remaining);
        setRemainingGenerations(data.remaining);
        setIsAtLimit(data.remaining === 0);
      }

      setAnalysis(data.analysis);
      setVariants(data.variants);
      setState("complete");
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setState("error");
    }
  };

  const handleSelect = (variant: Variant | null) => {
    setSelectedVariant(variant);
  };

  const handleReset = () => {
    setState("idle");
    setUploadedFile(null);
    setUploadPreview(null);
    setVariants([]);
    setSelectedVariant(null);
    setAnalysis(null);
    setError(null);
    saveAttemptedRef.current = false;
    setSavedProjectId(null);
    setCurrentBatch(1);
  };

  // Regenerate variants for an existing project (adds new batch)
  const handleRegenerate = async () => {
    if (!savedProjectId || !user) {
      // Fallback to creating new variants if no project saved
      handleUpload();
      return;
    }

    setState("processing");
    setToast({ message: "Generating new variants... This may take 1-2 minutes.", type: "info" });

    try {
      const response = await fetch(`/api/projects/${savedProjectId}/regenerate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Regeneration failed:', result);
        throw new Error(result.error || 'Failed to regenerate');
      }

      // Update variants with new batch
      const newVariants: Variant[] = result.variants.map((v: { variant_number: number; strategy: string; image_url: string; recommended_background: 'light' | 'dark' }) => ({
        id: v.variant_number,
        strategy: v.strategy,
        design: {
          imageData: v.image_url,
          imageUrl: v.image_url,
        },
        colorClassification: {
          recommendedBackground: v.recommended_background || 'light',
          productHint: '',
        },
      }));

      setVariants(newVariants);
      setCurrentBatch(result.batchNumber);
      setState("complete");
      setToast({ 
        message: `✨ Created ${result.variantCount} new variants (Variant ${result.batchNumber})!`, 
        type: "success" 
      });
    } catch (error) {
      console.error('Regeneration error:', error);
      setState("complete"); // Go back to complete state so user can try again
      setToast({ 
        message: error instanceof Error ? error.message : "Failed to regenerate variants", 
        type: "error" 
      });
    }
  };

  const handleOpenEditor = (variant?: Variant) => {
    const variantToEdit = variant || selectedVariant;
    if (!variantToEdit) return;
    setSelectedVariant(variantToEdit);
    setState("editing");
  };

  const handleEditorComplete = () => {
    setState("complete");
  };

  const handleCancelEdit = () => {
    setState("complete");
  };

  const handleDownload = async (variant?: Variant) => {
    const variantToDownload = variant || selectedVariant;
    if (!variantToDownload) return;

    try {
      const imageUrl = variantToDownload.design.imageUrl || variantToDownload.design.imageData;
      const filename = generateDownloadFileName({
        designName: 'POD_Remix',
        batchNumber: currentBatch,
        variantNumber: variantToDownload.id,
        strategy: variantToDownload.strategy,
        style: 'Original'
      });
      
      await downloadImage(imageUrl, filename);
      setToast({ message: "Design downloaded successfully!", type: "success" });
    } catch (error) {
      console.error("Download error:", error);
      setToast({ message: "Failed to download design", type: "error" });
    }
  };

  return (
    <>
      <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8 pt-4 flex flex-col">
        <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
          {/* Header - hidden when editing or processing to focus attention on the animation */}
          {state !== "editing" && state !== "processing" && (
            <div className="text-center mb-6 transition-state">
              {state === "complete" ? (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
                    Your Variants Are Ready
                  </h1>
                  <p className="text-base text-muted max-w-lg mx-auto">
                    Click any design to customize colors and placement — then download
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
                    Clone Bestselling POD Designs
                  </h1>
                  <p className="text-base text-muted max-w-lg mx-auto">
                    Screenshot any trending design from Amazon, Etsy, or social media — get 4 unique, print-ready variants instantly
                  </p>
                </>
              )}
            </div>
          )}

          {/* Main Content Area */}
          <div className="transition-state flex-1">
            {/* State: Idle / Upload */}
            {state === "idle" && (
              <div className="space-y-8">
                {/* Upload Section */}
                <UploadSection 
                  onImageSelect={handleImageSelect}
                  onClear={handleReset}
                  onGenerate={uploadedFile ? handleUpload : undefined}
                  hasImage={!!uploadedFile}
                  remainingGenerations={user ? undefined : remainingGenerations}
                  isAtLimit={!user && isAtLimit}
                  onSignIn={() => setShowAuthModal(true)}
                />
              </div>
            )}

            {/* State: Processing */}
            {state === "processing" && (
              <LoadingSpinner
                message="Creating your design variations..."
                imagePreview={uploadPreview || undefined}
                estimatedTime={25}
              />
            )}

            {/* State: Complete */}
            {state === "complete" && (
              <div className="space-y-6">
                {/* Gallery with sliding action bar */}
                <div className="py-6 md:py-10">
                  <RemixGallery
                    variants={variants}
                    onSelect={handleSelect}
                    onEdit={handleOpenEditor}
                    onDownload={handleDownload}
                  />
                </div>

                
                {/* Save Designs CTA - Only for guests */}
                {!user && (
                  <div className="w-full lg:w-1/2 mx-auto">
                    <SaveDesignsCTA 
                      onSuccess={() => setToast({ 
                        message: "Check your email for the magic link!", 
                        type: "success" 
                      })}
                      pendingProjectData={uploadPreview && variants.length > 0 ? {
                        originalImage: uploadPreview,
                        variants: variants.map(v => ({
                          id: v.id,
                          strategy: v.strategy,
                          design: {
                            imageData: v.design.imageData,
                            imageUrl: v.design.imageUrl,
                          },
                          colorClassification: v.colorClassification ? {
                            recommendedBackground: v.colorClassification.recommendedBackground,
                          } : undefined,
                        })),
                        createdAt: new Date().toISOString(),
                      } : null}
                    />
                  </div>
                )}

                {/* USP Message */}
                <div className="w-full lg:w-1/2 mx-auto mt-8">
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded bg-orange/5 border border-orange/20">
                    <svg className="w-5 h-5 text-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-orange">All variants are print-on-demand ready</span>
                  </div>
                </div>
              </div>
            )}

            {/* State: Editing */}
            {state === "editing" && selectedVariant && (
              <DesignEditor
                variant={selectedVariant}
                mockupType={selectedVariant.colorClassification?.recommendedBackground || 'light'}
                onSave={handleEditorComplete}
                onCancel={handleCancelEdit}
              />
            )}

            {/* State: Error */}
            {state === "error" && (
              <div className="space-y-6 max-w-lg mx-auto">
                <div className="bg-white rounded p-6 shadow-card border-2 border-destructive/50">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-destructive/10 rounded flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-destructive"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-destructive mb-2 text-lg">
                        Generation Failed
                      </h3>
                      <p className="text-sm text-muted">{error}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleReset}
                    className="
                      px-8 py-4
                      bg-primary
                      text-white
                      font-semibold
                      rounded
                      shadow-md
                      hover:shadow-lg
                      hover:scale-105
                      active:scale-95
                      transition-all duration-200
                      focus-ring
                      flex items-center gap-2
                    "
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="mt-auto pt-6 pb-2 text-center text-sm text-muted">
            <p>Powered by Gemini AI</p>
          </footer>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Loading..." />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
