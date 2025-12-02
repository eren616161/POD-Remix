"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ProjectCard from "@/components/ProjectCard";
import LibraryControls, { SortOption, ViewMode } from "@/components/LibraryControls";

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
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Client-side sorting
  const handleSortChange = (newSortBy: SortOption) => {
    setSortBy(newSortBy);
    
    const sorted = [...projects].sort((a, b) => {
      if (newSortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (newSortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    
    setProjects(sorted);
  };

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
                  bg-white rounded border border-border shadow-sm
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

  return (
    <>
      {/* Controls */}
      <LibraryControls
        sortBy={sortBy}
        viewMode={viewMode}
        onSortChange={handleSortChange}
        onViewModeChange={setViewMode}
        totalCount={projects.length}
      />

      {/* Project Grid/List */}
      <div className={
        viewMode === "grid"
          ? "grid grid-cols-2 lg:grid-cols-4 gap-4"
          : "space-y-4"
      }>
        {projects.map((project, index) => (
          viewMode === "grid" ? (
            <ProjectCard key={project.id} project={project} priority={index < 4} />
          ) : (
            <ProjectListItem key={project.id} project={project} />
          )
        ))}
      </div>
    </>
  );
}

// List view item component
function ProjectListItem({ project }: { project: Project }) {
  return (
    <Link
      href={`/designs/${project.id}`}
      className="
        group flex items-center gap-4 p-4
        bg-white rounded border border-border shadow-sm
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
        <h3 className="font-semibold truncate text-primary">{project.name}</h3>
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
