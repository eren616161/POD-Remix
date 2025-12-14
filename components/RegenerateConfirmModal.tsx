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
      {/* Simple dark backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isRegenerating ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
        <div className="p-6">
          {/* Simple solid teal circle with white icon */}
          <div className="w-14 h-14 mx-auto bg-accent rounded-full flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>

          {/* Content */}
          <div className="text-center space-y-3 mb-6">
            <h2 className="text-xl font-bold text-foreground">Generate New Variants?</h2>
            <p className="text-muted">
              This will create <span className="font-semibold text-accent">4 new design variations</span> using your original image.
            </p>
            
            {/* Simple info box */}
            <div className="bg-accent/5 border border-accent/20 rounded px-4 py-3 mt-4">
              <p className="font-medium text-sm text-accent">
                Your existing variants will be kept
              </p>
              <p className="text-muted text-sm mt-1">
                New designs will appear as <span className="font-medium text-foreground">&quot;Variant {nextBatchNumber}&quot;</span>
              </p>
            </div>
            
            <p className="text-xs text-muted/70 pt-1">
              Generation takes about 1-2 minutes
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isRegenerating}
              className="flex-1 px-4 py-3 bg-secondary hover:bg-secondary/80 rounded font-medium transition-all duration-200 disabled:opacity-50 border border-border"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isRegenerating}
              className={`flex-1 px-4 py-3 text-white rounded font-semibold shadow-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-md active:scale-[0.98] ${
                isRegenerating ? 'bg-gray-500' : 'bg-accent hover:bg-accent/90'
              }`}
            >
              {isRegenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
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
    </div>
  );
}
