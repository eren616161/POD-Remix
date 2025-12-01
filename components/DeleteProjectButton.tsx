"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DeleteConfirmModal from "./DeleteConfirmModal";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
}

export default function DeleteProjectButton({ projectId, projectName }: DeleteProjectButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
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
      // Could add toast here for error feedback
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded transition-colors flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>

      <DeleteConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        projectName={projectName}
      />
    </>
  );
}

