/**
 * Utility functions for standardized download file naming across the application
 * 
 * Format: [Design Name]_[Variant Batch]_[Strategy Name]_[Style].png
 */

interface DownloadFileNameOptions {
  designName?: string;
  batchNumber?: number;
  variantNumber?: number;
  strategy: string;
  style?: string;
}

/**
 * Sanitizes a string for use in a filename
 * Removes special characters, replaces spaces with underscores
 */
function sanitizeForFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '_'); // Replace spaces with underscores
}

/**
 * Generates a standardized download filename
 * Format: [Design Name]_V[Batch]_[Strategy Name]_[Style].png
 * 
 * Examples:
 * - "Sunset_Beach_V1_Color_Pop_Original.png"
 * - "Design_V2_Bold_Minimalist_Vibrant.png"
 */
export function generateDownloadFileName(options: DownloadFileNameOptions): string {
  const {
    designName = 'Design',
    batchNumber = 1,
    variantNumber,
    strategy,
    style = 'Original'
  } = options;

  const safeName = sanitizeForFilename(designName);
  const safeStrategy = sanitizeForFilename(strategy);
  const safeStyle = sanitizeForFilename(style);
  
  // Include variant number if provided (e.g., V1-2 means batch 1, variant 2)
  const batchPart = variantNumber 
    ? `V${batchNumber}-${variantNumber}`
    : `V${batchNumber}`;

  return `${safeName}_${batchPart}_${safeStrategy}_${safeStyle}.png`;
}

/**
 * Downloads an image from a URL or data URL with proper blob handling
 * to ensure the file downloads rather than opening in browser
 */
export async function downloadImage(
  imageUrl: string, 
  filename: string
): Promise<void> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

