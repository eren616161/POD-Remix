"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthProvider";

interface UploadTabsProps {
  onImageSelect: (file: File, preview: string) => void;
}

type TabType = "upload" | "url" | "recent";

interface RecentProject {
  id: string;
  name: string;
  original_image_url: string;
  created_at: string;
  variants?: { id: string }[];
}

export default function UploadTabs({ onImageSelect }: UploadTabsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch recent projects when user is logged in and tab is selected
  useEffect(() => {
    if (user && activeTab === "recent") {
      fetchRecentProjects();
    }
  }, [user, activeTab]);

  const fetchRecentProjects = async () => {
    if (!user) return;
    setLoadingProjects(true);
    try {
      const response = await fetch(`/api/projects?limit=5`);
      if (response.ok) {
        const data = await response.json();
        setRecentProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch recent projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const previewUrl = reader.result as string;
      setPreview(previewUrl);
      onImageSelect(file, previewUrl);
    };
    reader.onerror = () => {
      console.error("Failed to read file");
      reader.abort();
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setUrlError("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      setUrlError("Please enter a valid URL");
      return;
    }

    setUrlLoading(true);
    setUrlError(null);

    try {
      // Fetch image from URL
      const response = await fetch(urlInput);
      if (!response.ok) {
        throw new Error("Failed to fetch image");
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.startsWith("image/")) {
        throw new Error("URL does not point to an image");
      }

      const blob = await response.blob();
      const file = new File([blob], "uploaded-image.png", { type: blob.type });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const previewUrl = reader.result as string;
        setPreview(previewUrl);
        onImageSelect(file, previewUrl);
        setUrlInput("");
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      setUrlError(
        error instanceof Error ? error.message : "Failed to load image from URL"
      );
    } finally {
      setUrlLoading(false);
    }
  };

  const handleSelectRecentProject = async (project: RecentProject) => {
    // Navigate to the project page instead of using the image
    window.location.href = `/designs/${project.id}`;
  };

  const tabs: { id: TabType; label: string; icon: ReactNode }[] = [
    {
      id: "upload",
      label: "Upload File",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
    {
      id: "url",
      label: "Paste URL",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      id: "recent",
      label: "Recent",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/20 rounded mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded
              font-medium text-sm transition-all duration-200
              min-h-[48px]
              ${
                activeTab === tab.id
                  ? "bg-surface text-primary shadow-md"
                  : "text-muted hover:text-foreground hover:bg-surface/50"
              }
            `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {/* Upload Tab */}
        {activeTab === "upload" && (
          <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded p-8 cursor-pointer
              transition-all duration-200
              ${
                isDragging
                  ? "border-primary bg-primary/5 shadow-lg scale-[1.02]"
                  : "border-muted hover:border-primary hover:bg-surface"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />

            {preview ? (
              <div className="space-y-4">
                <div className="relative w-full aspect-square max-w-md mx-auto overflow-hidden rounded shadow-md">
                  <img
                    src={preview}
                    alt="Upload preview"
                    className="w-full h-full object-contain bg-surface"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      setPreview(null);
                    }}
                  />
                </div>
                <p className="text-center text-sm text-muted">
                  Click or drag to change image
                </p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-secondary rounded flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                </div>

                <div>
                  <p className="text-lg font-medium mb-2">
                    Drop your POD design here
                  </p>
                  <p className="text-sm text-muted">
                    or click to browse files
                  </p>
                  <p className="text-xs text-muted mt-2">
                    PNG, JPG, WEBP (max 10MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* URL Tab */}
        {activeTab === "url" && (
          <div className="p-6 bg-surface rounded border border-border">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setUrlError(null);
                    }}
                    placeholder="https://example.com/image.png"
                    className="
                      flex-1 px-4 py-3 rounded
                      bg-background border border-border
                      text-foreground placeholder:text-muted
                      focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                      transition-all duration-200
                    "
                  />
                  <button
                    onClick={handleUrlSubmit}
                    disabled={urlLoading}
                    className="
                      px-6 py-3 bg-primary text-white font-medium rounded
                      hover:bg-primary/90 active:scale-95
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                      min-h-[48px]
                    "
                  >
                    {urlLoading ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      "Load"
                    )}
                  </button>
                </div>
                {urlError && (
                  <p className="mt-2 text-sm text-destructive">{urlError}</p>
                )}
              </div>

              {preview && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Preview</p>
                  <div className="relative w-full aspect-square max-w-xs mx-auto overflow-hidden rounded shadow-md">
                    <img
                      src={preview}
                      alt="URL preview"
                      className="w-full h-full object-contain bg-muted/20"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-muted text-center">
                Enter a direct link to an image file (PNG, JPG, WEBP)
              </p>
            </div>
          </div>
        )}

        {/* Recent Projects Tab */}
        {activeTab === "recent" && (
          <div className="p-4 bg-surface rounded border border-border">
            {!user ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/20 rounded flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-muted mb-2">Sign in to see your recent projects</p>
                <p className="text-xs text-muted">Your design history will appear here</p>
              </div>
            ) : loadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/20 rounded flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-muted mb-2">No recent projects</p>
                <p className="text-xs text-muted">Upload your first design to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted mb-3">Continue where you left off</p>
                {recentProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelectRecentProject(project)}
                    className="
                      w-full flex items-center gap-3 p-3 rounded
                      bg-background hover:bg-muted/20
                      transition-all duration-200 text-left
                      min-h-[56px]
                    "
                  >
                    <div className="w-10 h-10 bg-muted/20 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={project.original_image_url}
                        alt={project.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                      <p className="text-xs text-muted">
                        {new Date(project.created_at).toLocaleDateString()}
                        {project.variants && ` • ${project.variants.length} variants`}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

