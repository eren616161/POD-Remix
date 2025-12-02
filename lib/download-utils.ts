/**
 * Utility functions for standardized download file naming across the application
 * 
 * Format: [Design Name]_[Batch#]_[Strategy-Short]_[Style-Short].png
 */

interface DownloadFileNameOptions {
  designName?: string;
  batchNumber?: number;
  variantNumber?: number;
  strategy: string;
  style?: string;
}

/**
 * Strategy name abbreviations for shorter filenames
 */
const strategyAbbreviations: Record<string, string> = {
  // Common strategies
  'minimalist': 'Min',
  'minimalistic': 'Min',
  'bold': 'Bold',
  'vibrant': 'Vib',
  'vintage': 'Vint',
  'retro': 'Retro',
  'modern': 'Mod',
  'classic': 'Cls',
  'elegant': 'Elg',
  'playful': 'Play',
  'professional': 'Pro',
  'artistic': 'Art',
  'abstract': 'Abs',
  'geometric': 'Geo',
  'organic': 'Org',
  'colorful': 'Clrfl',
  'monochrome': 'Mono',
  'gradient': 'Grad',
  'flat': 'Flat',
  'dimensional': 'Dim',
  '3d': '3D',
  'hand drawn': 'Hand',
  'hand-drawn': 'Hand',
  'sketch': 'Sktch',
  'watercolor': 'WC',
  'illustration': 'Illu',
  'typography': 'Typo',
  'text-based': 'Txt',
  'icon': 'Icon',
  'logo': 'Logo',
  'pattern': 'Ptrn',
  'simple': 'Simp',
  'complex': 'Cplx',
  'detailed': 'Det',
  'clean': 'Cln',
  'grunge': 'Grnge',
  'distressed': 'Dstr',
  'weathered': 'Wthr',
  'neon': 'Neon',
  'pastel': 'Pstl',
  'dark': 'Dark',
  'light': 'Lght',
  'warm': 'Warm',
  'cool': 'Cool',
  'nature': 'Nat',
  'urban': 'Urb',
  'rustic': 'Rstc',
  'industrial': 'Ind',
  'bohemian': 'Boho',
  'scandinavian': 'Scnd',
  'tropical': 'Trop',
  'nautical': 'Naut',
  'floral': 'Flor',
  'animal': 'Anml',
  'sports': 'Sprt',
  'music': 'Musc',
  'food': 'Food',
  'travel': 'Trvl',
  'seasonal': 'Seas',
  'holiday': 'Hol',
  'celebration': 'Celb',
  'motivational': 'Motv',
  'funny': 'Fnny',
  'sarcastic': 'Sarc',
  'cute': 'Cute',
  'edgy': 'Edgy',
  'pop art': 'Pop',
  'pop': 'Pop',
  'comic': 'Comc',
  'anime': 'Anme',
  'kawaii': 'Kawa',
  'gothic': 'Goth',
  'punk': 'Punk',
  'hip hop': 'HipH',
  'country': 'Ctry',
  'western': 'West',
  'eastern': 'East',
  'tribal': 'Trbl',
  'celtic': 'Celt',
  'aztec': 'Aztc',
  'mandala': 'Mndl',
  'zen': 'Zen',
  'spiritual': 'Sprt',
  'cosmic': 'Csmc',
  'space': 'Spce',
  'sci-fi': 'ScFi',
  'fantasy': 'Fant',
  'horror': 'Horr',
  'halloween': 'Hllw',
  'christmas': 'Xmas',
  'valentine': 'Val',
  'easter': 'Estr',
  'patriotic': 'Patr',
  'pride': 'Prde',
  'awareness': 'Awar',
  // Color strategies
  'color pop': 'CPop',
  'color shift': 'CShft',
  'color inversion': 'CInv',
  'color harmony': 'CHarm',
  'complementary': 'Comp',
  'analogous': 'Anl',
  'triadic': 'Tri',
  'split-complementary': 'SpCp',
  // Compound strategies - common AI-generated ones
  'bold minimalist': 'BldMn',
  'vibrant retro': 'VibRt',
  'modern vintage': 'ModVt',
  'playful geometric': 'PlayG',
  'elegant classic': 'ElgCl',
  'artistic abstract': 'ArtAb',
};

/**
 * Style name abbreviations for shorter filenames
 */
const styleAbbreviations: Record<string, string> = {
  'original': 'Orig',
  'enhanced': 'Enh',
  'edited': 'Edit',
  'modified': 'Mod',
  'custom': 'Cust',
  'variation': 'Var',
  'alternative': 'Alt',
  'version': 'Ver',
  'draft': 'Drft',
  'final': 'Fnl',
  'print': 'Prnt',
  'web': 'Web',
  'social': 'Socl',
  'banner': 'Bnr',
  'poster': 'Pstr',
  'shirt': 'Shrt',
  't-shirt': 'Shrt',
  'tshirt': 'Shrt',
  'mug': 'Mug',
  'hoodie': 'Hood',
  'sticker': 'Stkr',
  'phone case': 'Phne',
  'tote': 'Tote',
  'pillow': 'Pilw',
  'canvas': 'Canv',
};

/**
 * Abbreviates a strategy or style name
 */
function abbreviateName(name: string, abbreviations: Record<string, string>): string {
  const lowerName = name.toLowerCase().trim();
  
  // Check for exact match first
  if (abbreviations[lowerName]) {
    return abbreviations[lowerName];
  }
  
  // Check for partial matches (for compound strategies)
  for (const [key, value] of Object.entries(abbreviations)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }
  
  // If no match, create a smart abbreviation
  // Take first 4 chars of each word, max 8 chars total
  const words = name.split(/[\s\-_]+/);
  if (words.length === 1) {
    // Single word: capitalize first letter + next 3 consonants/chars
    return name.slice(0, 4).replace(/^./, c => c.toUpperCase());
  }
  
  // Multiple words: take first 2-3 chars of each word
  const abbreviated = words
    .map(w => w.slice(0, words.length > 2 ? 2 : 3))
    .join('')
    .slice(0, 8);
  
  return abbreviated.replace(/^./, c => c.toUpperCase());
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
 * Generates a standardized download filename with shortened names
 * Format: [Design Name]_B[Batch]_[Strategy-Short]_[Style-Short].png
 * 
 * Examples:
 * - "Sunset_Beach_B1_CPop_Orig.png"
 * - "Design_B2_BldMn_Enh.png"
 */
export function generateDownloadFileName(options: DownloadFileNameOptions): string {
  const {
    designName = 'Design',
    batchNumber = 1,
    variantNumber,
    strategy,
    style = 'Original'
  } = options;

  // Sanitize and abbreviate
  const safeName = sanitizeForFilename(designName).slice(0, 20); // Limit name length
  const shortStrategy = abbreviateName(strategy, strategyAbbreviations);
  const shortStyle = abbreviateName(style, styleAbbreviations);
  
  // Include variant number if provided (e.g., B1-2 means batch 1, variant 2)
  const batchPart = variantNumber 
    ? `B${batchNumber}-${variantNumber}`
    : `B${batchNumber}`;

  return `${safeName}_${batchPart}_${shortStrategy}_${shortStyle}.png`;
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
