/**
 * Shared design utilities that can be used in both client and server components.
 * This file contains NO server-side dependencies (no sharp, no Node.js APIs).
 */

// TypeScript interfaces for design analysis
export interface DesignAnalysis {
  theme: string;           // Main subject/concept
  style: string;           // Artistic style
  graphic_colors: string[]; // Colors used in graphics/illustrations (not text)
  text: string;            // Visible text or empty
  design_type: "text_only" | "graphic_only" | "mixed";
  tone: string;            // Emotional feel (funny, sarcastic, wholesome, edgy)
  typography_style: string; // Font style (bold sans-serif, hand-drawn script)
  text_color: string;      // The color of the main text (e.g., "white", "black", "red") or "none" if no text
  character_action?: string; // What the main character/subject is doing (e.g., "lifting barbell") or "none"
}

/**
 * Derive optimal background from analysis.
 * Priority: TEXT_COLOR > GRAPHIC_COLORS
 * 
 * Light text (white, cream, yellow) → needs DARK background
 * Dark text (black, navy, brown) → needs LIGHT background
 */
export function deriveOptimalBackground(analysis: DesignAnalysis): 'light' | 'dark' {
  const lightColorKeywords = ['white', 'cream', 'yellow', 'light', 'beige', 'cyan', 'pink'];
  
  const isLightColor = (color: string) => 
    lightColorKeywords.some(kw => color.toLowerCase().includes(kw));
  
  // Priority 1: Use text_color if design has text
  if (analysis.text_color && analysis.text_color.toLowerCase() !== 'none') {
    return isLightColor(analysis.text_color) ? 'dark' : 'light';
  }
  
  // Priority 2: For graphic_only, check if majority of graphic colors are light
  if (analysis.design_type === 'graphic_only' && analysis.graphic_colors.length > 0) {
    const lightCount = analysis.graphic_colors.filter(isLightColor).length;
    return lightCount > analysis.graphic_colors.length / 2 ? 'dark' : 'light';
  }
  
  // Default: light background (most common for POD)
  return 'light';
}

