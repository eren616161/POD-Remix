"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DesignEditor from "@/components/DesignEditor";
import type { Variant, Project } from "@/lib/supabase/types";

interface UrlVariant {
  id: string;
  variant_number: number;
  batch_number: number;
  strategy: string;
  image_url: string;
  recommended_background: 'light' | 'dark';
}

export default function EditVariantPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const variantId = params.variantId as string;

  const [variant, setVariant] = useState<UrlVariant | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVariant = async () => {
      const supabase = createClient();
      
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/?signin=true');
        return;
      }

      // First verify the project belongs to the user and get the name
      const { data: project } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single() as { data: Pick<Project, 'id' | 'name'> | null };

      if (!project) {
        setError('Project not found');
        setIsLoading(false);
        return;
      }

      setProjectName(project.name);

      // Then fetch the variant
      const { data: variantData, error } = await supabase
        .from('variants')
        .select('*')
        .eq('id', variantId)
        .eq('project_id', projectId)
        .single() as { data: Variant | null; error: Error | null };

      if (error || !variantData) {
        setError('Variant not found');
        setIsLoading(false);
        return;
      }

      setVariant({
        id: variantData.id,
        variant_number: variantData.variant_number,
        batch_number: variantData.batch_number || 1,
        strategy: variantData.strategy,
        image_url: variantData.image_url,
        recommended_background: variantData.recommended_background,
      });
      setIsLoading(false);
    };

    fetchVariant();
  }, [projectId, variantId, router]);

  const handleSave = () => {
    // Navigate back to project
    router.push(`/designs/${projectId}`);
  };

  const handleCancel = () => {
    router.push(`/designs/${projectId}`);
  };

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8 flex flex-col">
        {/* Skeleton that matches editor layout - prevents UI jump */}
        <div className="max-w-6xl mx-auto w-full flex-1">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-32 bg-secondary rounded animate-pulse" />
                <div className="h-4 w-24 bg-secondary rounded animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-24 h-10 bg-secondary rounded animate-pulse" />
              <div className="w-28 h-10 bg-secondary rounded animate-pulse" />
            </div>
          </div>
          
          {/* Editor content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main canvas area */}
            <div className="lg:col-span-3">
              <div className="aspect-[4/3] bg-secondary rounded animate-pulse" />
            </div>
            
            {/* Sidebar */}
            <div className="space-y-4">
              <div className="h-8 w-24 bg-secondary rounded animate-pulse" />
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-secondary rounded animate-pulse" />
                ))}
              </div>
              <div className="h-8 w-20 bg-secondary rounded animate-pulse mt-6" />
              <div className="flex gap-2">
                <div className="h-12 w-12 bg-secondary rounded animate-pulse" />
                <div className="h-12 w-12 bg-secondary rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !variant) {
    return (
      <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Variant Not Found</h2>
          <p className="text-muted">{error || 'The variant you are looking for does not exist.'}</p>
          <button
            onClick={() => router.push(`/designs/${projectId}`)}
            className="px-6 py-3 bg-primary text-white font-medium rounded shadow-md hover:shadow-lg transition-all"
          >
            Back to Project
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8 flex flex-col">
      <DesignEditor
        urlVariant={variant}
        mockupType={variant.recommended_background}
        onSave={handleSave}
        onCancel={handleCancel}
        returnPath={`/designs/${projectId}`}
        designName={projectName}
        batchNumber={variant.batch_number}
      />
    </main>
  );
}
