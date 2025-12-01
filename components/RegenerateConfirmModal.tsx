"use client";

interface RegenerateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isRegenerating: boolean;
  currentBatchCount: number;
}

export default function RegenerateConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isRegenerating,
  currentBatchCount,
}: RegenerateConfirmModalProps) {
  if (!isOpen) return null;

  const nextBatchNumber = currentBatchCount + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
        onClick={isRegenerating ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded shadow-card w-full max-w-md p-6 border border-border">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center space-y-3 mb-6">
          <h2 className="text-xl font-bold text-foreground">Generate New Variants?</h2>
          <p className="text-muted">
            This will create <span className="font-medium text-foreground">4 new design variations</span> using your original image.
          </p>
          <div className="text-sm text-primary/80 bg-primary/5 px-4 py-2 rounded">
            <p className="font-medium">✨ Your existing variants will be kept!</p>
            <p className="text-muted mt-1">New designs will appear as &quot;Variant {nextBatchNumber}&quot;</p>
          </div>
          <p className="text-xs text-muted">
            Generation takes about 1-2 minutes
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isRegenerating}
            className="flex-1 px-4 py-3 bg-secondary hover:bg-secondary/80 rounded font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isRegenerating}
            className="flex-1 px-4 py-3 bg-primary text-white rounded font-medium hover:bg-primary/90 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isRegenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

