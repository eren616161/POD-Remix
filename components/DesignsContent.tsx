"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ProjectCard from "@/components/ProjectCard";
import LibraryControls, { FilterOption, ViewMode } from "@/components/LibraryControls";
import Toast from "@/components/Toast";

const VARIANT_FAVORITES_STORAGE_KEY = "pod-remix-variant-favorites";

// 4 distinct background colors - T-shirt simulation (POD product colors)
const variantBackgrounds = {
  dark: ['bg-black', 'bg-gray-800', 'bg-slate-700', 'bg-zinc-800'],
  light: ['bg-white', 'bg-gray-100', 'bg-neutral-100', 'bg-stone-50'],
};

// Dot pattern styles for canvas texture effect
const getDotPatternStyle = (isDark: boolean): React.CSSProperties => ({
  backgroundImage: `radial-gradient(circle, ${
    isDark 
      ? 'rgba(255, 255, 255, 0.15)' // Light dots on dark bg
      : 'rgba(0, 0, 0, 0.08)'        // Dark dots on light bg
  } 1px, transparent 1px)`,
  backgroundSize: '12px 12px',
});

interface Variant {
  id: string;
  variant_number: number;
  image_url: string;
  thumbnail_url?: string | null;
  recommended_background: 'light' | 'dark';
  strategy: string;
}

// Re-export for ProjectCard
export type { Variant };

interface Project {
  id: string;
  name: string;
  original_image_url: string;
  created_at: string;
  variants: Variant[];
}

interface DesignsContentProps {
  initialProjects: Project[];
}

// Example templates for empty state
const exampleTemplates = [
  {
    id: "example-1",
    label: "Abstract Art",
    emoji: "🎨",
    description: "Modern abstract design",
  },
  {
    id: "example-2",
    label: "Typography",
    emoji: "✍️",
    description: "Bold text design",
  },
  {
    id: "example-3",
    label: "Illustration",
    emoji: "🖼️",
    description: "Hand-drawn style",
  },
];

export default function DesignsContent({ initialProjects }: DesignsContentProps) {
  const [projects] = useState<Project[]>(initialProjects);
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [variantFavorites, setVariantFavorites] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Load variant favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(VARIANT_FAVORITES_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setVariantFavorites(new Set(parsed));
      } catch (e) {
        console.error("Failed to parse variant favorites:", e);
      }
    }
  }, []);

  // Client-side filtering
  const handleFilterChange = (newFilterBy: FilterOption) => {
    setFilterBy(newFilterBy);
  };

  // Get all favorited variants across all projects
  const getFavoritedVariants = (): Array<Variant & { projectId: string; projectName: string }> => {
    const result: Array<Variant & { projectId: string; projectName: string }> = [];
    for (const project of projects) {
      for (const variant of project.variants) {
        if (variantFavorites.has(variant.id)) {
          result.push({
            ...variant,
            projectId: project.id,
            projectName: project.name,
          });
        }
      }
    }
    return result;
  };

  // Get filtered projects - sorted by newest first by default
  const filteredProjects = projects.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const favoritedVariants = getFavoritedVariants();

  if (projects.length === 0) {
    return (
      /* Enhanced Empty State */
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-32 h-32 bg-accent/10 rounded flex items-center justify-center mb-6">
          <svg className="w-16 h-16 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">No designs yet</h2>
        <p className="text-muted text-center max-w-md mb-8">
          Start creating your POD design library. Upload a design and we&apos;ll generate unique variants for you.
        </p>

        {/* Example Templates */}
        <div className="mb-8">
          <p className="text-sm text-muted text-center mb-4">Or try an example to see how it works:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {exampleTemplates.map((template) => (
              <Link
                key={template.id}
                href="/"
                className="
                  flex items-center gap-3 px-4 py-3
                  bg-surface rounded border border-border shadow-sm
                  hover:border-accent/30 hover:shadow-md
                  transition-all duration-200
                  min-h-[56px]
                "
              >
                <span className="text-2xl">{template.emoji}</span>
                <div className="text-left">
                  <p className="font-medium text-sm">{template.label}</p>
                  <p className="text-xs text-muted">{template.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/"
          className="px-8 py-4 bg-accent text-white font-semibold rounded shadow-md hover:shadow-lg hover:bg-accent/90 active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Your First Design
        </Link>
      </div>
    );
  }

  // Empty state for favorites filter
  if (filterBy === "favorites" && favoritedVariants.length === 0) {
    return (
      <>
        <LibraryControls
          filterBy={filterBy}
          viewMode={viewMode}
          onFilterChange={handleFilterChange}
          onViewModeChange={setViewMode}
          totalCount={projects.length}
        />
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-24 h-24 bg-orange/10 rounded flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-orange" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">No favorites yet</h2>
          <p className="text-muted text-center max-w-md mb-6">
            Click the star icon on any variant in a project to add it to your favorites for quick access.
          </p>
          <button
            onClick={() => setFilterBy("all")}
            className="px-6 py-3 bg-accent text-white font-semibold rounded shadow-md hover:shadow-lg hover:bg-accent/90 active:scale-[0.98] transition-all"
          >
            View All Projects
          </button>
        </div>
        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </>
    );
  }

  // Show favorited variants
  if (filterBy === "favorites") {
    return (
      <>
        {/* Controls */}
        <LibraryControls
          filterBy={filterBy}
          viewMode={viewMode}
          onFilterChange={handleFilterChange}
          onViewModeChange={setViewMode}
          totalCount={favoritedVariants.length}
        />

        {/* Favorited Variants Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {favoritedVariants.map((variant) => (
            <FavoriteVariantCard
              key={variant.id}
              variant={variant}
              projectId={variant.projectId}
              projectName={variant.projectName}
            />
          ))}
        </div>

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Controls */}
      <LibraryControls
        filterBy={filterBy}
        viewMode={viewMode}
        onFilterChange={handleFilterChange}
        onViewModeChange={setViewMode}
        totalCount={filteredProjects.length}
      />

      {/* Project Grid/List */}
      <div className={
        viewMode === "grid"
          ? "grid grid-cols-2 lg:grid-cols-4 gap-4"
          : "space-y-4"
      }>
        {filteredProjects.map((project, index) => (
          viewMode === "grid" ? (
            <ProjectCard 
              key={project.id} 
              project={project} 
              priority={index < 4}
            />
          ) : (
            <ProjectListItem 
              key={project.id} 
              project={project}
            />
          )
        ))}
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

// Favorite Variant Card - Links directly to editor
function FavoriteVariantCard({ 
  variant,
  projectId,
  projectName,
}: { 
  variant: Variant;
  projectId: string;
  projectName: string;
}) {
  const isDarkBg = variant.recommended_background === 'dark';
  const bgIndex = (variant.variant_number - 1) % 4;
  const bgClass = variantBackgrounds[isDarkBg ? 'dark' : 'light'][bgIndex];

  return (
    <Link
      href={`/designs/${projectId}/edit/${variant.id}`}
      className="group block bg-surface rounded-sm overflow-hidden shadow-sm hover:shadow-md hover:ring-1 hover:ring-accent/20 hover:-translate-y-0.5 transition-all duration-200 border border-border"
    >
      {/* Thumbnail */}
      <div 
        className={`aspect-square ${bgClass} relative overflow-hidden`}
        style={getDotPatternStyle(isDarkBg)}
      >
        <Image
          src={variant.thumbnail_url || variant.image_url}
          alt={variant.strategy}
          fill
          loading="lazy"
          className="object-contain p-6 transition-transform duration-200 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 250px"
        />
        
        {/* Favorite indicator */}
        <div className="absolute top-2 right-2">
          <svg 
            className="w-4 h-4 text-orange drop-shadow-sm" 
            fill="currentColor"
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-3 py-2 bg-surface">
        <h3 className="text-sm font-semibold text-foreground truncate">{variant.strategy}</h3>
        <p className="text-xs text-muted truncate">{projectName}</p>
      </div>
    </Link>
  );
}

// List view item component
function ProjectListItem({ 
  project 
}: { 
  project: Project; 
}) {
  return (
    <Link
      href={`/designs/${project.id}`}
      className="
        group flex items-center gap-4 p-4
        bg-surface rounded border border-border shadow-sm
        hover:border-accent/30 hover:shadow-md
        transition-all duration-200
      "
    >
      <div className="w-16 h-16 bg-secondary rounded overflow-hidden flex-shrink-0 relative">
        <Image
          src={project.original_image_url}
          alt={project.name}
          fill
          loading="lazy"
          className="object-cover"
          sizes="64px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate text-foreground">{project.name}</h3>
        <p className="text-sm text-muted">
          {new Date(project.created_at).toLocaleDateString()} • {project.variants?.length || 0} variants
        </p>
      </div>
      <svg className="w-5 h-5 text-muted group-hover:text-accent transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
