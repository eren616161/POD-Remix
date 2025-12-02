"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import LoadingSpinner from "@/components/LoadingSpinner";

const PENDING_PROJECT_KEY = "pod-remix-pending-project";

export default function TransferPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<"checking" | "transferring" | "success" | "error" | "no-data">("checking");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const transferProject = async () => {
      // Wait for auth to load
      if (authLoading) return;

      // If not logged in, redirect to home
      if (!user) {
        router.push("/?signin=true");
        return;
      }

      // Check for pending project data
      const pendingData = localStorage.getItem(PENDING_PROJECT_KEY);
      
      if (!pendingData) {
        setStatus("no-data");
        // No pending project, redirect to designs
        setTimeout(() => router.push("/designs"), 1500);
        return;
      }

      try {
        const projectData = JSON.parse(pendingData);
        setStatus("transferring");

        // First, try to generate a name for the project
        let projectName = `Design ${new Date().toLocaleDateString()}`;
        try {
          const nameResponse = await fetch("/api/generate-name", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageData: projectData.originalImage }),
          });
          if (nameResponse.ok) {
            const { name } = await nameResponse.json();
            projectName = name;
          }
        } catch {
          // Use default name on error
        }

        // Transfer the project
        const response = await fetch("/api/transfer-project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...projectData,
            projectName,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to transfer project");
        }

        // Clear the pending project data
        localStorage.removeItem(PENDING_PROJECT_KEY);
        
        setStatus("success");
        
        // Redirect to the project page
        setTimeout(() => {
          router.push(`/designs/${result.projectId}`);
        }, 1500);
      } catch (error) {
        console.error("Transfer error:", error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Failed to transfer project");
        
        // Clear corrupted data
        localStorage.removeItem(PENDING_PROJECT_KEY);
        
        // Redirect to designs after showing error
        setTimeout(() => router.push("/designs"), 3000);
      }
    };

    transferProject();
  }, [user, authLoading, router]);

  if (authLoading || status === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <LoadingSpinner message="Checking authentication..." />
      </main>
    );
  }

  if (status === "transferring") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <LoadingSpinner message="Saving your designs..." />
        </div>
      </main>
    );
  }

  if (status === "success") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-emerald-500/15 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Designs Saved!</h1>
          <p className="text-muted">Your designs have been saved to your library. Redirecting...</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-destructive/15 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Transfer Failed</h1>
          <p className="text-muted">{errorMessage}</p>
          <p className="text-sm text-muted">Redirecting to your library...</p>
        </div>
      </main>
    );
  }

  // no-data status
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 mx-auto bg-accent/15 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Welcome!</h1>
        <p className="text-muted">Redirecting to your design library...</p>
      </div>
    </main>
  );
}

