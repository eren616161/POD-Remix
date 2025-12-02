"use client";

import { useState } from "react";

interface BackfillStatus {
  needsThumbnails: number;
  totalVariants: number;
  hasThumbnails: number;
}

interface BackfillResult {
  success: boolean;
  message: string;
  processed: number;
  failed: number;
  total: number;
  errors?: string[];
}

export default function BackfillPage() {
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/backfill-thumbnails");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Failed to check status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const runBackfill = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/backfill-thumbnails", {
        method: "POST",
      });
      const data = await res.json();
      setResult(data);
      // Refresh status after backfill
      await checkStatus();
    } catch (err) {
      console.error("Backfill failed:", err);
      setResult({
        success: false,
        message: "Backfill failed",
        processed: 0,
        failed: 0,
        total: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🖼️ Thumbnail Backfill</h1>

        {/* Status Check */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Check Status</h2>
          <button
            onClick={checkStatus}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "Checking..." : "Check Status"}
          </button>

          {status && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <p><strong>Total Variants:</strong> {status.totalVariants}</p>
              <p><strong>Need Thumbnails:</strong> <span className="text-orange-600 font-bold">{status.needsThumbnails}</span></p>
              <p><strong>Already Have Thumbnails:</strong> <span className="text-green-600">{status.hasThumbnails}</span></p>
            </div>
          )}
        </div>

        {/* Run Backfill */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Run Backfill</h2>
          <p className="text-gray-600 mb-4">
            This will generate thumbnails for all variants that don&apos;t have one.
            It may take a few minutes.
          </p>
          <button
            onClick={runBackfill}
            disabled={isRunning || (status?.needsThumbnails === 0)}
            className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? "⏳ Running Backfill... (this may take a few minutes)" : "🚀 Run Backfill"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-lg shadow p-6 ${result.success ? "bg-green-50" : "bg-red-50"}`}>
            <h2 className="text-xl font-semibold mb-4">
              {result.success ? "✅ Backfill Complete!" : "❌ Backfill Failed"}
            </h2>
            <p><strong>Processed:</strong> {result.processed} / {result.total}</p>
            <p><strong>Failed:</strong> {result.failed}</p>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold text-red-600">Errors:</p>
                <ul className="list-disc list-inside text-sm text-red-500">
                  {result.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

