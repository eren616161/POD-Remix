"use client";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  projectName: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  projectName,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
        onClick={isDeleting ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded shadow-card w-full max-w-md p-6 border border-border">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto bg-destructive/10 rounded flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center space-y-3 mb-6">
          <h2 className="text-xl font-bold">Delete Project?</h2>
          <p className="text-muted">
            Are you sure you want to delete <span className="font-medium text-foreground">&quot;{projectName}&quot;</span>?
          </p>
          <p className="text-sm text-destructive/80 bg-destructive/5 px-4 py-2 rounded">
            This will permanently delete the original image and all 4 variants. This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 bg-secondary hover:bg-secondary/80 rounded font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 bg-destructive text-white rounded font-medium hover:bg-destructive/90 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
