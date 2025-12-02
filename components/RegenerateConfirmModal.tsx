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
      {/* Backdrop with subtle gradient */}
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(15, 118, 110, 0.3) 50%, rgba(249, 115, 22, 0.2) 100%)',
        }}
        onClick={isRegenerating ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
        {/* Top gradient accent bar */}
        <div 
          className="h-1.5 w-full"
          style={{
            background: 'linear-gradient(90deg, #0f766e 0%, #14b8a6 50%, #f97316 100%)',
          }}
        />
        
        <div className="p-6">
          {/* Icon with gradient background */}
          <div 
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.15) 0%, rgba(249, 115, 22, 0.15) 100%)',
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
            }}
          >
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #f97316 100%)',
              }}
            >
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-3 mb-6">
            <h2 className="text-xl font-bold text-foreground">Generate New Variants?</h2>
            <p className="text-muted">
              This will create <span className="font-semibold bg-gradient-to-r from-accent to-orange bg-clip-text text-transparent">4 new design variations</span> using your original image.
            </p>
            
            {/* Info box with gradient border */}
            <div 
              className="relative rounded-lg p-[1px] mt-4"
              style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #f97316 100%)',
              }}
            >
              <div 
                className="rounded-lg px-4 py-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.08) 0%, rgba(249, 115, 22, 0.08) 100%)',
                }}
              >
                <p className="font-semibold text-sm text-accent flex items-center justify-center gap-2">
                  <span>✨</span>
                  Your existing variants will be kept!
                </p>
                <p className="text-muted text-sm mt-1">
                  New designs will appear as <span className="font-medium text-orange">&quot;Variant {nextBatchNumber}&quot;</span>
                </p>
              </div>
            </div>
            
            <p className="text-xs text-muted pt-2">
              ⏱️ Generation takes about 1-2 minutes
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isRegenerating}
              className="flex-1 px-4 py-3 bg-secondary hover:bg-secondary/80 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 border border-border"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isRegenerating}
              className="flex-1 px-4 py-3 text-white rounded-lg font-semibold shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isRegenerating 
                  ? '#64748b' 
                  : 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #f97316 100%)',
              }}
            >
              {isRegenerating ? (
                <>
                  <div 
                    className="animate-spin rounded-full h-5 w-5 border-2 border-white/30"
                    style={{ borderTopColor: 'white' }}
                  />
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
