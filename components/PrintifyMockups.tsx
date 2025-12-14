"use client";

import Image from 'next/image';

/**
 * Printify-style product mockups with dynamic color support
 * These are simplified, clean versions optimized for the preview UI
 * The fill color can be changed dynamically to match the selected product color
 */

interface MockupProps {
  fillColor: string;
  className?: string;
}

// Bella Canvas 3001 - Real product images mapping
// Maps color names to the corresponding real product photos
const BELLA_CANVAS_3001_IMAGES: Record<string, string> = {
  // Direct matches
  'red': '/mockups/bella-canvas-3001/red.png',
  'true royal': '/mockups/bella-canvas-3001/true-royal.png',
  'royal': '/mockups/bella-canvas-3001/true-royal.png',
  'royal blue': '/mockups/bella-canvas-3001/true-royal.png',
  'black': '/mockups/bella-canvas-3001/black.png',
  'navy': '/mockups/bella-canvas-3001/navy.png',
  'navy blue': '/mockups/bella-canvas-3001/navy.png',
  'forest': '/mockups/bella-canvas-3001/forest.png',
  'forest green': '/mockups/bella-canvas-3001/forest.png',
  'dark gray heather': '/mockups/bella-canvas-3001/dark-gray-heather.png',
  'dark grey heather': '/mockups/bella-canvas-3001/dark-gray-heather.png',
  'dark heather': '/mockups/bella-canvas-3001/dark-gray-heather.png',
  'charcoal': '/mockups/bella-canvas-3001/dark-gray-heather.png',
  'white': '/mockups/bella-canvas-3001/white.png',
  'athletic gray': '/mockups/bella-canvas-3001/athletic-gray.png',
  'athletic grey': '/mockups/bella-canvas-3001/athletic-gray.png',
  'heather gray': '/mockups/bella-canvas-3001/athletic-gray.png',
  'heather grey': '/mockups/bella-canvas-3001/athletic-gray.png',
  'sport grey': '/mockups/bella-canvas-3001/athletic-gray.png',
  'sport gray': '/mockups/bella-canvas-3001/athletic-gray.png',
};

// Get the best matching image for a color, or null if no match
function getBellaCanvas3001Image(colorName: string): string | null {
  const normalized = colorName.toLowerCase().trim();
  
  // Direct match
  if (BELLA_CANVAS_3001_IMAGES[normalized]) {
    return BELLA_CANVAS_3001_IMAGES[normalized];
  }
  
  // Partial match - check if color name contains a key or key contains color name
  for (const [key, value] of Object.entries(BELLA_CANVAS_3001_IMAGES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return null;
}

// Convert hex color to a color name for image matching
function hexToColorName(hex: string): string {
  const colorMatches: Record<string, string> = {
    '#DC2626': 'red',
    '#FF0000': 'red',
    '#C41E3A': 'red',
    '#4169E1': 'true royal',
    '#000000': 'black',
    '#1a1a1a': 'black',
    '#1B1F3B': 'navy',
    '#000080': 'navy',
    '#228B22': 'forest',
    '#013220': 'forest',
    '#4A4A4A': 'dark gray heather',
    '#36454F': 'dark gray heather',
    '#3A3A3A': 'dark gray heather',
    '#FFFFFF': 'white',
    '#9CA3AF': 'athletic gray',
    '#B8B8B8': 'athletic gray',
    '#808080': 'athletic gray',
  };
  
  const normalized = hex.toUpperCase();
  return colorMatches[normalized] || colorMatches[hex] || '';
}

// Bella Canvas 3001 - Unisex Jersey Short Sleeve Tee
// Uses REAL product images when available, falls back to SVG for unsupported colors
// Print Area Specifications:
// - Actual Print Area: 3951 × 4800 px (aspect ratio 0.823:1)
// - Image dimensions: ~1000x1000px (square product photos)
// - Print area on real image: centered horizontally, starting ~24% from top
export function BellaCanvas3001Mockup({ fillColor, className = "" }: MockupProps) {
  const isLight = isLightFill(fillColor);
  
  // Try to get a real image for this color
  const colorName = hexToColorName(fillColor);
  const realImage = getBellaCanvas3001Image(colorName);
  
  // If we have a real image, use it (print area is handled by ColorStylePicker)
  if (realImage) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        {/* Real product image - background removed via CSS */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src={realImage}
            alt="Bella Canvas 3001"
            fill
            className="object-contain"
            style={{
              // Remove light/white background using multiply blend mode
              mixBlendMode: 'multiply',
              // Additional filter to make background more transparent
              filter: 'contrast(1.05) brightness(1.02)',
            }}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
        {/* Print area indicator is rendered by ColorStylePicker, not here */}
      </div>
    );
  }
  
  // Fallback to SVG mockup for colors without real images
  const collarColor = adjustBrightness(fillColor, -30);
  
  return (
    <svg 
      viewBox="0 0 773 731" 
      className={`w-full h-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background - ALWAYS LIGHT (doesn't change with shirt color) */}
      <path fill="#FAFAF8" transform="scale(0.914286 0.944998)" d="M0 0L845 0L845 774L0 774L0 0Z"/>
      
      {/* Shadow/Outline - Dark */}
      <path fill="#030203" transform="scale(0.914286 0.944998)" d="M506.624 55.278C512.984 57.4981 520.055 59.1656 526.362 61.4924C548.145 69.5286 569.914 77.6913 591.67 85.7941L613.207 93.7661C616.269 94.8989 624.057 97.5897 626.609 99.1363C631.237 101.941 637.533 107.015 642.021 110.43L672.587 133.667L752.13 194.033C766.223 204.738 781.22 216.592 795.513 226.885C786.172 239.825 776.698 254.37 767.649 267.659L715.388 344.401C698.807 338.171 681.922 329.87 665.463 323.85L665.447 739.78L536.171 739.797L196.713 739.808L196.747 323.851C191.984 325.32 186.989 327.782 182.331 329.609C170.622 334.202 158.361 340.15 146.584 344.354L66.5238 226.761C70.8092 223.904 76.709 219.15 80.9078 215.963L108.404 195.091L192.642 131.123L220.006 110.298C224.481 106.893 230.579 102.003 235.277 99.119C237.999 97.4478 245.459 94.9306 248.822 93.6914L270.733 85.5945C292.585 77.4543 314.467 69.2015 336.363 61.1811C341.975 59.1255 348.993 57.2522 354.876 55.3545C356.037 55.8271 359.426 58.725 360.733 59.7771C371.644 68.5594 385.256 76.0024 398.975 79.2051C438.956 88.5391 474.538 82.5086 506.624 55.278Z"/>
      
      {/* Main T-shirt Body - DYNAMIC COLOR */}
      <path fill={fillColor} transform="scale(0.914286 0.944998)" d="M525.064 63.6028L626.069 101.321C625.913 105.699 625.234 110.503 624.804 114.905C617.911 185.44 619.372 261.301 662.89 321.347C663.517 334.458 662.968 352.975 662.969 366.408L662.97 454.05L662.939 737.464L520.091 737.432L239.926 737.431L199.058 737.38C199.7 724.473 199.109 706.268 199.108 692.948L199.107 604.671L199.139 321.2C205.038 312.775 209.584 305.947 214.321 296.665C237.312 251.609 241.792 198.458 239.713 148.623C239.068 133.182 236.977 116.827 235.707 101.446C238.551 100.047 243.853 98.2508 246.96 97.0982L267.116 89.6123C290.292 80.9945 314.004 72.4435 337.025 63.5049C338.632 87.0856 343.19 105.203 358.113 124.659C372.992 144.057 395.142 157.561 419.622 160.51C443.866 163.554 468.312 156.689 487.425 141.467C504.838 127.434 517.032 107.959 522.05 86.1656C523.845 78.0499 524.147 71.6452 525.064 63.6028Z"/>
      
      {/* Sleeve Details - DYNAMIC COLOR (matches shirt) */}
      <path fill={fillColor} transform="scale(0.914286 0.944998)" d="M627.333 102.542C634.709 107.904 641.925 113.678 649.25 119.133C697.176 154.825 744.259 191.962 792.339 227.418C787.432 233.654 780.356 244.748 775.769 251.504L744.656 297.261C735.076 311.857 724.545 326.841 714.691 341.336C699.369 335.949 683.855 328.165 668.563 322.459C666.204 321.579 663.578 320.135 662.073 318.045C627.041 269.397 621.172 206.505 623.569 148.326C624.211 132.738 626.189 117.912 627.333 102.542Z"/>
      <path fill={fillColor} transform="scale(0.914286 0.944998)" d="M234.226 102.748L234.491 103.037C236.01 113.998 236.802 125.245 237.535 136.285C240.833 185.968 238.679 240.81 217.724 286.752C213.98 294.962 204.487 314.323 197.873 320.196C194.999 322.748 154.025 338.902 147.46 341.36L117.711 297.653L87.6004 253.44C81.8314 244.937 75.7632 235.617 69.7467 227.347C86.6615 215.217 104.791 200.865 121.473 188.206L234.226 102.748Z"/>
      
      {/* Print area indicator - dashed rectangle 
          Represents the printable area (3951 × 4800 px actual size)
          Scaled proportionally for visual display in mockup
          Positioned on chest area of the detailed t-shirt */}
      <rect 
        x="252" y="180" 
        width="270" height="328" 
        fill="none" 
        stroke={isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)'} 
        strokeWidth="2" 
        strokeDasharray="10,6" 
        rx="4"
      />
      
      {/* Collar - Darker shade of shirt color (like reference image) */}
      <g id="collar-details">
        {/* Main collar band - darker version of shirt color */}
        <path 
          fill={collarColor}
          transform="scale(0.914286 0.944998)" 
          d="M355.85 59.0624C383.268 81.0839 411.016 88.7656 446.255 84.9385C468.439 82.6122 489.381 73.5559 506.269 58.9851C506.086 61.5541 505.957 67.9641 504.812 69.9723C484.351 85.2679 469.834 92.8107 444.214 95.2576C409.488 98.5743 383.632 90.7077 356.596 69.3387C356.307 65.9163 356.058 62.4906 355.85 59.0624Z"
        />
      </g>
    </svg>
  );
}

// Export the color-to-image mapping for use in other components
export { BELLA_CANVAS_3001_IMAGES, getBellaCanvas3001Image };

// Gildan 18500 - Heavy Blend Adult Hooded Sweatshirt
export function Gildan18500Mockup({ fillColor, className = "" }: MockupProps) {
  const isLight = isLightFill(fillColor);
  const strokeColor = isLight ? '#2a2a2a' : '#444';
  const hoodColor = isLight ? adjustBrightness(fillColor, -15) : adjustBrightness(fillColor, 15);
  const stitchColor = isLight ? '#888' : '#555';
  const drawstringColor = isLight ? '#666' : '#888';
  
  return (
    <svg 
      viewBox="0 0 460 540" 
      className={`w-full h-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="g18500-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.15"/>
        </filter>
        <linearGradient id="g18500-fabric" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="black" stopOpacity="0.06"/>
        </linearGradient>
      </defs>
      
      {/* Hood - behind body */}
      <path 
        d="M125 88 
           C125 35 175 8 230 8 
           C285 8 335 35 335 88 
           L335 108 
           L125 108 
           Z" 
        fill={hoodColor} 
        stroke={strokeColor} 
        strokeWidth="2"
      />
      
      {/* Main hoodie body */}
      <path
        d="M95 108 
           L125 108 
           L125 88 
           C125 58 170 42 230 42 
           C290 42 335 58 335 88 
           L335 108 
           L365 108 
           L445 162 
           L410 235 
           L365 192 
           L365 525 
           L95 525 
           L95 192 
           L50 235 
           L15 162 
           Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#g18500-shadow)"
      />
      
      {/* Fabric texture */}
      <path
        d="M95 108 L125 108 L125 88 C125 58 170 42 230 42 C290 42 335 58 335 88 L335 108 L365 108 L445 162 L410 235 L365 192 L365 525 L95 525 L95 192 L50 235 L15 162 Z"
        fill="url(#g18500-fabric)"
      />
      
      {/* Hood opening */}
      <ellipse cx="230" cy="105" rx="62" ry="26" fill={hoodColor} stroke={strokeColor} strokeWidth="1.5"/>
      
      {/* Drawstrings */}
      <line x1="195" y1="128" x2="195" y2="215" stroke={drawstringColor} strokeWidth="3" strokeLinecap="round"/>
      <line x1="265" y1="128" x2="265" y2="215" stroke={drawstringColor} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="195" cy="218" r="4" fill={drawstringColor}/>
      <circle cx="265" cy="218" r="4" fill={drawstringColor}/>
      
      {/* Kangaroo pocket */}
      <path 
        d="M135 395 
           L135 455 
           C135 480 175 498 230 498 
           C285 498 325 480 325 455 
           L325 395" 
        fill="none" 
        stroke={stitchColor} 
        strokeWidth="2" 
        strokeDasharray="6,4"
      />
      
      {/* Sleeve seams */}
      <path d="M95 192 L95 265" stroke={stitchColor} strokeWidth="1" strokeDasharray="5,4"/>
      <path d="M365 192 L365 265" stroke={stitchColor} strokeWidth="1" strokeDasharray="5,4"/>
      
      {/* Bottom hem */}
      <path d="M100 518 L360 518" stroke={stitchColor} strokeWidth="1" strokeDasharray="5,4"/>
      
      {/* Print area indicator */}
      <rect 
        x="155" y="138" 
        width="150" height="160" 
        fill="none" 
        stroke={isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'} 
        strokeWidth="1.5" 
        strokeDasharray="8,6" 
        rx="4"
      />
    </svg>
  );
}

// Gildan 18000 - Heavy Blend Adult Crewneck Sweatshirt (Printify-style detailed mockup)
// Print Zone Specifications from Printify Template (lib/pod-products.ts):
// - Template Canvas: 4200 x 4800 px (at 300 DPI)
// - Large Center Chest Print Zone: 3852 x 4398 px, centered at (2100, 2400)
//
// IMPORTANT: The SVG mockup has a DIFFERENT aspect ratio than the Printify template:
// - Template: 4200 x 4800 (portrait, 0.875 ratio)
// - SVG ViewBox: 945 x 726 (landscape, 1.3 ratio)
// Therefore, we use MOCKUP-SPECIFIC coordinates for the visual print area indicator,
// while the actual export uses the accurate template specs from pod-products.ts.

export function Gildan18000Mockup({ fillColor, className = "" }: MockupProps) {
  const isLight = isLightFill(fillColor);
  // Dynamic colors based on fill
  const collarColor = isLight ? adjustBrightness(fillColor, -10) : adjustBrightness(fillColor, 10);
  const cuffColor = isLight ? adjustBrightness(fillColor, -5) : adjustBrightness(fillColor, 5);
  const shadowColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
  
  // ============================================================================
  // Print Area Indicator (Mockup Visualization)
  // These values position the dashed rectangle on the VISUAL mockup garment.
  // The actual Printify export dimensions are stored in lib/pod-products.ts.
  // ============================================================================
  
  // SVG ViewBox: 945 x 726
  // Garment chest area in SVG coordinates (visually measured from the artwork):
  // Note: The sweatshirt artwork is slightly left-of-center in the SVG
  // - Horizontal center of garment body: ~458 px (adjusted left)
  // - Vertical center of printable chest: ~365 px (adjusted down)
  // - Visible chest width for printing: ~240 px
  // - Visible chest height for printing: ~274 px
  
  const MOCKUP_CENTER_X = 458;    // Center of garment body in SVG (shifted left)
  const MOCKUP_CENTER_Y = 365;    // Center of printable chest area in SVG (shifted down)
  const MOCKUP_PRINT_WIDTH = 240; // Visual width of print area indicator
  const MOCKUP_PRINT_HEIGHT = 274; // Visual height of print area indicator
  
  // Calculate top-left corner from center (center-based rendering)
  const printAreaX = MOCKUP_CENTER_X - (MOCKUP_PRINT_WIDTH / 2);   // 458 - 120 = 338
  const printAreaY = MOCKUP_CENTER_Y - (MOCKUP_PRINT_HEIGHT / 2);  // 365 - 137 = 228
  const scaledWidth = MOCKUP_PRINT_WIDTH;
  const scaledHeight = MOCKUP_PRINT_HEIGHT;
  
  return (
    <svg 
      viewBox="0 0 945 726" 
      className={`w-full h-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <path fill="#F5F5F2" d="M0 0L945 0L945 726L0 726L0 0Z"/>
      
      {/* Main sweatshirt outline/shadow */}
      <path fill="#030303" transform="scale(1.05398 1.05398)" d="M377.665 103.617C378.376 103.699 388.049 108.926 389.836 109.601C417.278 119.967 448.746 118.178 473.927 103.623C476.142 104.035 478.676 104.627 480.867 104.91C491.337 106.261 500.518 110.055 510.374 113.61L546.397 126.611C582.714 139.726 619.242 152.487 655.052 166.933C665.168 171.014 679.676 176.639 689.039 181.928C691.482 183.308 702.179 201.038 704.377 204.602C723.787 236.495 742.882 268.579 761.659 300.848L776.683 326.503C779.376 331.107 784.931 339.978 786.524 344.676C789.614 353.789 781.279 372.846 778.206 381.666C772.832 397.023 767.376 412.352 761.839 427.651L753.071 452.162C751.497 456.572 749.923 461.347 747.954 465.592C747.08 467.476 744.86 468.579 743.037 469.695C742.048 475.511 738.537 501.386 735.861 504.145C732.242 505.632 727.109 504.799 723.182 504.711L705.425 504.481C693.613 504.296 681.79 504.226 669.982 504.069C669.008 503.952 667.109 504.073 666.548 503.184C664.508 499.965 664.665 495.197 664.337 491.431C663.702 484.13 663.565 476.805 661.942 469.615C661.033 465.589 659.037 460.99 658.918 456.913C658.576 445.269 659.212 433.315 659.647 421.683C660.105 406.836 660.81 391.998 661.762 377.175C663.063 360.848 664.447 344.528 665.916 328.215C658.747 328.027 651.566 328.465 644.416 328.525C636.78 328.59 632.913 328.906 625.902 332.014C625.836 353.947 623.728 375.691 623.233 397.417C621.671 466.017 607.677 527.618 582.483 591.564C553.369 589.288 515.637 587.565 486.495 587.428C466.839 587.284 446.97 586.087 427.318 586.433C375.089 587.352 321.526 587.304 269.489 591.595C254.891 553.642 243.725 518.137 236.406 477.795C231.721 451.969 230.433 427.023 228.951 400.935C227.499 377.99 226.54 355.017 226.074 332.032C215.152 326.994 198.206 328.196 186.071 328.178C189.233 359.374 191.334 390.669 192.371 422.008C192.765 433.385 193.299 445.402 193.08 456.798C192.878 461.039 191.003 465.2 190.111 469.312C188.426 477.072 188.233 485.006 187.541 492.88C187.308 495.536 187.389 503.566 183.961 503.868C177.1 504.472 170.014 504.08 163.09 504.19L136.063 504.686C131.785 504.778 118.749 505.702 115.675 503.719C113.426 500.096 109.945 475.606 109.101 469.818C108.465 469.427 107.834 469.029 107.207 468.624C105.212 467.327 104.514 466.833 103.57 464.56C101.345 459.2 99.4732 453.645 97.5232 448.177L87.0658 419.071C82.0234 405.052 77.0533 391.008 72.1557 376.938C61.9696 347.46 60.8642 351.287 76.8314 323.939L95.7086 291.711L133.899 227.222C142.021 213.693 150.208 200.062 158.874 186.879C160.685 184.124 162.001 182.254 164.977 180.758C175.704 175.362 187.587 170.659 198.727 166.224C222.99 156.547 247.451 147.375 272.095 138.714L329.584 117.954C339.213 114.481 349.438 110.674 359.098 107.409C362.335 106.315 373.692 104.382 377.665 103.617Z"/>
      
      {/* Main body - DYNAMIC COLOR */}
      <path fill={fillColor} transform="scale(1.05398 1.05398)" d="M376.978 106.508C377.828 106.687 377.728 106.757 378.553 106.673C405.468 121.904 439.8 122.662 467.565 109.72C469.286 108.918 471.86 107.449 473.466 106.885L475.123 106.43C478.27 106.868 488.936 108.641 491.435 110.033L492.884 110.138C497.86 111.296 509.088 115.77 514.491 117.739L553.638 131.836L600.635 148.84L613.291 153.459C615.13 154.113 618.25 154.762 619.594 155.921C620.181 157.723 619.813 157.927 619.392 159.942L620.563 160.807L621.802 156.782C633.024 160.519 646.578 166.31 657.729 170.63C664.819 173.377 682.65 180.585 688.235 184.383C688.083 196.792 685.888 207.869 683.617 220.052L676.424 258.229C673.308 275.573 670.484 292.967 667.952 310.406C667.219 315.313 666.867 320.742 666.084 325.476C656.452 325.704 646.809 325.811 637.168 326.387C633.18 326.626 626.02 329.407 624.623 329.153L623.649 327.723L622.711 328.352C624.533 331.948 622.84 354.982 622.58 361.065C621.951 379.503 620.992 397.929 619.703 416.334C618.771 431.402 617.76 447.826 615.638 462.747C612.433 484.078 607.861 505.181 601.948 525.925C599.322 535.491 596.578 544.968 593.614 554.435C593.181 555.817 592.519 556.869 591.276 557.579L589.438 557.535L588.223 558.388C589.788 558.715 590.462 558.595 591.549 559.553C590.911 563.826 582.73 584.484 580.802 589.206C559.159 587.095 536.783 586.848 515.034 586.051C464.213 583.825 413.325 583.517 362.481 585.129L325.771 586.416C308.861 586.893 287.896 587.42 271.186 589.176C269.205 584.32 260.809 563.074 260.261 559.005C260.401 558.229 260.371 558.616 259.945 557.707C257.22 552.758 252.052 533.13 250.398 527.101C244.521 505.889 239.274 484.128 236.315 462.283C232.894 437.031 232.139 411.176 230.424 385.761C229.209 367.766 229.46 349.453 228.303 331.515C228.099 330.376 228.175 330.32 227.365 329.447C225.053 328.876 219.635 326.929 218.214 326.775C207.844 325.655 196.299 325.747 185.821 325.457C183.334 298.287 177.231 268.908 172.616 241.916C169.594 224.241 163.779 201.967 163.788 184.302C168.602 181.049 179.944 176.46 185.759 174.058C199.772 168.376 213.837 162.824 227.953 157.404L229.577 157.092C232.048 159.16 232.816 168.065 233.276 171.378C234.482 177.388 235.29 183.472 235.697 189.589L236.766 187.942C235.652 175.296 234.284 168.399 231.642 156.117C235.18 154.423 242.081 152.141 246.041 150.71L272.43 141.18L359.196 109.881L359.962 111.013L360.564 110.27C363.081 108.457 373.644 106.778 376.978 106.508Z"/>
      
      {/* Bottom hem - DYNAMIC */}
      <path fill={fillColor} transform="scale(1.05398 1.05398)" d="M260.261 559.005C269.821 557.549 280.053 556.887 289.736 556.1C316.685 554.094 343.689 552.9 370.71 552.519C443.267 550.369 515.888 552.329 588.223 558.388C589.788 558.715 590.462 558.595 591.549 559.553C590.911 563.826 582.73 584.484 580.802 589.206C559.159 587.095 536.783 586.848 515.034 586.051C464.213 583.825 413.325 583.517 362.481 585.129L325.771 586.416C308.861 586.893 287.896 587.42 271.186 589.176C269.205 584.32 260.809 563.074 260.261 559.005Z"/>
      
      {/* Left sleeve detail - DYNAMIC */}
      <path fill={fillColor} transform="scale(1.05398 1.05398)" d="M227.953 157.404L229.577 157.092C232.048 159.16 232.816 168.065 233.276 171.378C234.482 177.388 235.29 183.472 235.697 189.589C236.141 197.884 237.463 211.237 237.778 218.976C238.771 243.406 238.217 309.418 227.365 329.447C225.053 328.876 219.635 326.929 218.214 326.775C207.844 325.655 196.299 325.747 185.821 325.457C183.334 298.287 177.231 268.908 172.616 241.916C169.594 224.241 163.779 201.967 163.788 184.302C168.602 181.049 179.944 176.46 185.759 174.058C199.772 168.376 213.837 162.824 227.953 157.404Z"/>
      
      {/* Left sleeve shadow */}
      <path fill={shadowColor} transform="scale(1.05398 1.05398)" d="M227.953 157.404L229.577 157.092C232.048 159.16 232.816 168.065 233.276 171.378L232.893 171.919L232.613 171.831C232.271 173.541 232.262 174.747 232.186 176.472L231.625 176.439L231.058 175.258C231.52 170.071 228.106 161.622 227.953 157.404Z"/>
      
      {/* Right sleeve detail - DYNAMIC */}
      <path fill={fillColor} transform="scale(1.05398 1.05398)" d="M621.802 156.782C633.024 160.519 646.578 166.31 657.729 170.63C664.819 173.377 682.65 180.585 688.235 184.383C688.083 196.792 685.888 207.869 683.617 220.052L676.424 258.229C673.308 275.573 670.484 292.967 667.952 310.406C667.219 315.313 666.867 320.742 666.084 325.476C656.452 325.704 646.809 325.811 637.168 326.387C633.18 326.626 626.02 329.407 624.623 329.153L623.649 327.723C620.84 318.919 618.204 308.667 617.141 299.467C613.34 266.561 612.944 232.448 615.558 199.431C616.549 186.914 617.711 172.982 620.563 160.807L621.802 156.782Z"/>
      
      {/* Collar inner - neck opening */}
      <path fill="#030303" transform="scale(1.05398 1.05398)" d="M376.978 106.508C377.828 106.687 377.728 106.757 378.553 106.673C405.468 121.904 439.8 122.662 467.565 109.72C469.286 108.918 471.86 107.449 473.466 106.885L475.123 106.43C474.416 126.844 472.735 141.021 457.703 156.861C440.035 175.48 412.776 175.769 394.882 157.401C380.082 142.209 377.106 126.544 376.978 106.508Z"/>
      
      {/* Collar ribbing - DYNAMIC */}
      <path fill={collarColor} transform="scale(1.05398 1.05398)" d="M378.553 106.673C405.468 121.904 439.8 122.662 467.565 109.72C469.286 108.918 471.86 107.449 473.466 106.885C473.596 109.582 473.339 123.659 471.685 125.041C462.764 132.493 442.363 134.983 430.82 135.421C416.676 135.958 392.375 134.036 380.597 125.279C378.58 123.78 378.432 109.942 378.553 106.673Z"/>
      
      {/* Collar detail lines */}
      <path fill="#8F8F90" transform="scale(1.05398 1.05398)" d="M399.277 128.404C400.958 128.412 408.456 129.502 409.391 130.687C406.64 130.401 401.521 129.899 399.277 128.404Z"/>
      <path fill="#8F8F90" transform="scale(1.05398 1.05398)" d="M446.999 129.383L447.922 129.078L448.265 129.532C446.631 130.442 445.246 130.528 443.397 130.833L442.543 130.846L442.188 130.433C443.939 129.639 445.12 129.602 446.999 129.383Z"/>
      
      {/* Collar inner band - DYNAMIC */}
      <path fill={collarColor} transform="scale(1.05398 1.05398)" d="M379.886 126.674C382.737 127.641 386.115 129.536 389.165 130.655C409.468 138.1 435.215 138.113 456.072 132.851C461.524 131.476 467.056 128.845 472.058 126.654C469.938 136.488 467.585 141.508 462.106 149.729C455.62 158.561 445.952 166.166 435.122 168.652C424.566 171.073 413.48 169.154 404.352 163.326C390.96 154.828 383.377 141.827 379.886 126.674Z"/>
      
      {/* Collar outer ring - DYNAMIC */}
      <path fill={fillColor} transform="scale(1.05398 1.05398)" d="M376.978 106.508C377.106 126.544 380.082 142.209 394.882 157.401C412.776 175.769 440.035 175.48 457.703 156.861C472.735 141.021 474.416 126.844 475.123 106.43C478.27 106.868 488.936 108.641 491.435 110.033C491.524 114.714 491.973 118.515 491.675 123.292C490.48 140.392 483.276 156.517 471.337 168.816C427.385 214.537 359.172 175.34 360.354 117.858C360.395 115.88 360.749 111.9 360.564 110.27C363.081 108.457 373.644 106.778 376.978 106.508Z"/>
      
      {/* Bottom hem details */}
      <path fill="#030303" transform="scale(1.05398 1.05398)" d="M392.275 550.898L428.98 550.725C441.25 550.773 453.963 551.124 466.184 550.924C481.147 551.113 496.108 551.442 511.065 551.914L540.499 553.409C544.206 553.605 552.287 554.261 555.719 554.123C558.204 554.452 559.264 554.586 561.761 554.518C565.257 554.844 587.973 556.732 589.438 557.535L588.223 558.388C515.888 552.329 443.267 550.369 370.71 552.519C343.689 552.9 316.685 554.094 289.736 556.1C280.053 556.887 269.821 557.549 260.261 559.005C260.401 558.229 260.371 558.616 259.945 557.707C262.128 557.18 268.768 556.616 271.215 556.365C279.731 555.42 288.27 554.692 296.823 554.18C301.354 553.97 307.129 553.846 311.516 553.257C315.242 553.282 318.338 553.074 322.038 552.814C326.206 552.8 334.204 552.401 338.213 551.95C340.348 552.096 345.412 551.762 347.753 551.675C362.591 551.265 377.432 551.005 392.275 550.898Z"/>
      
      {/* Body shadow details */}
      <path fill="#030303" transform="scale(1.05398 1.05398)" d="M491.435 110.033L492.884 110.138C493.592 112.892 493.05 123.764 492.668 126.96C490.242 146.463 480.195 164.211 464.724 176.328C435.048 199.534 397.405 192.591 374.694 163.626C362.627 148.464 357.055 129.14 359.196 109.881L359.962 111.013L360.564 110.27C360.749 111.9 360.395 115.88 360.354 117.858C359.172 175.34 427.385 214.537 471.337 168.816C483.276 156.517 490.48 140.392 491.675 123.292C491.973 118.515 491.524 114.714 491.435 110.033Z"/>
      
      {/* Sleeve shadows */}
      <path fill="#030303" transform="scale(1.05398 1.05398)" d="M619.392 159.942L620.563 160.807C617.711 172.982 616.549 186.914 615.558 199.431C612.944 232.448 613.34 266.561 617.141 299.467C618.204 308.667 620.84 318.919 623.649 327.723L622.711 328.352C607.86 292.292 611.571 198.75 619.392 159.942Z"/>
      <path fill="#030303" transform="scale(1.05398 1.05398)" d="M236.766 187.942C238.851 204.951 239.1 221.529 239.184 238.775C239.321 266.973 238.837 296.047 231.025 323.377C230.354 325.722 228.676 329.424 228.303 331.515C228.099 330.376 228.175 330.32 227.365 329.447C238.217 309.418 238.771 243.406 237.778 218.976C237.463 211.237 236.141 197.884 235.697 189.589L236.766 187.942Z"/>
      
      {/* Left cuff/sleeve - DYNAMIC */}
      <path fill={fillColor} transform="scale(1.05398 1.05398)" d="M161.114 187.872C161.162 197.744 164.573 212.94 166.378 222.957C170.371 244.085 174.183 265.248 177.814 286.441C179.868 298.702 181.895 311.162 183.111 323.741C187.447 368.605 191.305 414.094 190.307 459.18C190.254 461.557 188.818 464.429 187.746 466.485L187.63 467.295L187.51 468.207L184.182 501.912L116.841 502.374C115.375 492.907 113.308 478.083 111.28 469.199L111.594 468.074L106.64 465.562C104.672 461.713 102.033 453.75 100.475 449.44L90.1743 420.801C85.0919 406.705 80.0812 392.585 75.1426 378.438C64.1762 346.802 63.2154 351.953 79.9859 323.263L101.13 287.192L136.94 226.755C144.486 214.174 152.826 199.85 161.114 187.872Z"/>
      
      {/* Left cuff ribbing - DYNAMIC */}
      <path fill={fillColor} transform="scale(1.05398 1.05398)" d="M167.13 467.43C173.963 467.449 180.797 467.404 187.63 467.295L187.51 468.207L184.182 501.912L116.841 502.374C115.375 492.907 113.308 478.083 111.28 469.199L111.594 468.074C129.018 468.21 149.82 468.033 167.13 467.43Z"/>
      
      {/* Left cuff detail */}
      <path fill="#4F4F4F" transform="scale(1.05398 1.05398)" d="M167.13 467.43C173.963 467.449 180.797 467.404 187.63 467.295L187.51 468.207C162.102 468.674 136.692 469.005 111.28 469.199L111.594 468.074C129.018 468.21 149.82 468.033 167.13 467.43Z"/>
      <path fill={collarColor} transform="scale(1.05398 1.05398)" d="M167.388 471.094C168.571 470.572 171.207 470.669 172.484 470.841L172.978 471.578C171.165 471.607 168.385 472.056 167.388 471.094Z"/>
      <path fill={shadowColor} transform="scale(1.05398 1.05398)" d="M167.13 467.43C165.277 466.908 165.275 467.175 164.34 465.894L164.786 465.471C167.222 465.707 167.562 465.497 169.934 465.29C171.847 467.286 172.705 467.057 175.39 466.674C176.982 465.447 180.192 463.838 182.051 465.302L181.673 466.303C182.531 466.698 186.527 466.504 187.746 466.485L187.63 467.295C180.797 467.404 173.963 467.449 167.13 467.43Z"/>
      
      {/* Right cuff/sleeve - DYNAMIC */}
      <path fill={fillColor} transform="scale(1.05398 1.05398)" d="M664.223 466.827L664.014 466.201C663.46 464.59 661.582 461.165 661.583 459.725C661.593 400.679 664.974 338.748 675.183 280.619C678.19 263.161 681.339 245.729 684.63 228.323C686.71 217.258 690.749 198.533 690.838 187.823C699.033 199.594 707.449 214.087 714.909 226.511L752.489 289.959L772.558 324.198C776.352 330.684 780.606 337.429 783.677 344.241C785.331 347.912 785.295 350.394 784.417 354.377C782.586 362.682 779.13 371.905 776.32 379.975L759.87 426.257L750.882 451.221C749.532 454.952 747.004 462.602 745.118 465.749C739.339 468.74 735.638 467.933 729.094 467.708C721.072 467.912 712.119 467.337 704.303 467.736C700.748 467.34 693.81 467.434 690.001 467.409L664.612 467.286L664.223 466.827Z"/>
      
      {/* Right cuff detail */}
      <path fill={shadowColor} transform="scale(1.05398 1.05398)" d="M664.223 466.827C669.702 466.684 680.621 467.112 685.328 466.591L685.842 465.527C687.185 465.099 686.56 465.063 687.779 465.472L688.489 466.706C689.232 466.244 689.4 465.96 689.972 465.302C691.255 465.134 690.673 465.007 691.772 465.713L692.097 466.751L692.779 466.698C693.082 466.172 693.191 465.578 693.812 465.602C697.623 465.752 704.676 464.494 707.698 466.817C709.622 465.184 726.772 466.862 729.094 467.708C721.072 467.912 712.119 467.337 704.303 467.736C700.748 467.34 693.81 467.434 690.001 467.409L664.612 467.286L664.223 466.827Z"/>
      
      {/* Right cuff ribbing - DYNAMIC */}
      <path fill={fillColor} transform="scale(1.05398 1.05398)" d="M664.644 468.587C668.848 468.634 674.914 468.872 678.964 468.631C697.766 469.554 721.54 469.166 740.728 469.37C738.769 477.451 736.565 493.531 735.139 502.404L667.858 501.917C667.612 500.275 667.504 498.609 667.372 496.955C666.615 487.489 665.157 478.071 664.644 468.587Z"/>
      <path fill={collarColor} transform="scale(1.05398 1.05398)" d="M678.493 471.076C680.533 470.704 682 470.637 684.055 470.856L684.472 471.506C682.881 471.97 680.05 471.91 678.493 471.076Z"/>
      
      {/* Print area indicator (dashed rectangle) - Large Center Chest
          Positioned on the VISUAL mockup garment (not direct template mapping)
          Actual Printify specs (3852x4398 px) are in lib/pod-products.ts for exports */}
      <rect 
        x={printAreaX} 
        y={printAreaY} 
        width={scaledWidth} 
        height={scaledHeight} 
        fill="none" 
        stroke={isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)'} 
        strokeWidth="1.5" 
        strokeDasharray="8,5" 
        rx="2"
      />
    </svg>
  );
}

// Canvas/Poster - Stretched Canvas Print (from Canvas.svg style)
export function CanvasPrintMockup({ fillColor, className = "" }: MockupProps) {
  return (
    <svg 
      viewBox="0 0 400 500" 
      className={`w-full h-full ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="canvas-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="4" dy="5" stdDeviation="6" floodOpacity="0.2"/>
        </filter>
        <pattern id="canvas-texture" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#888"/>
          <rect width="2" height="2" fill="#999"/>
          <rect x="2" y="2" width="2" height="2" fill="#999"/>
        </pattern>
      </defs>
      
      {/* Frame depth - left side */}
      <path d="M10 10 L28 28 L28 472 L10 492 Z" fill="#9B8B75" stroke="#7B6B55" strokeWidth="1"/>
      
      {/* Frame depth - bottom */}
      <path d="M10 492 L28 472 L372 472 L390 492 Z" fill="#8B7B65" stroke="#7B6B55" strokeWidth="1"/>
      
      {/* Frame depth - right side */}
      <path d="M390 10 L372 28 L372 472 L390 492 Z" fill="#7B6B55" stroke="#6B5B45" strokeWidth="1"/>
      
      {/* Frame depth - top */}
      <path d="M10 10 L28 28 L372 28 L390 10 Z" fill="#AB9B85" stroke="#8B7B65" strokeWidth="1"/>
      
      {/* Canvas surface */}
      <rect 
        x="28" y="28" 
        width="344" height="444" 
        fill={fillColor} 
        stroke="#555" 
        strokeWidth="1" 
        filter="url(#canvas-shadow)"
      />
      
      {/* Canvas texture */}
      <rect 
        x="28" y="28" 
        width="344" height="444" 
        fill="url(#canvas-texture)" 
        opacity="0.03"
      />
      
      {/* Print area indicator */}
      <rect 
        x="48" y="48" 
        width="304" height="404" 
        fill="none" 
        stroke="rgba(100,100,100,0.35)" 
        strokeWidth="1.5" 
        strokeDasharray="10,6" 
        rx="2"
      />
      
      {/* Inner border guide */}
      <rect 
        x="32" y="32" 
        width="336" height="436" 
        fill="none" 
        stroke="rgba(100,100,100,0.15)" 
        strokeWidth="1" 
        strokeDasharray="4,4"
      />
      
      {/* Corner shadows */}
      <path d="M32 32 L48 48" stroke="rgba(100,100,100,0.25)" strokeWidth="1"/>
      <path d="M368 32 L352 48" stroke="rgba(100,100,100,0.25)" strokeWidth="1"/>
      <path d="M32 468 L48 452" stroke="rgba(100,100,100,0.25)" strokeWidth="1"/>
      <path d="M368 468 L352 452" stroke="rgba(100,100,100,0.25)" strokeWidth="1"/>
    </svg>
  );
}

// Helper function to determine if a color is light
function isLightFill(hex: string): boolean {
  // Remove # if present
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Helper function to adjust brightness of a hex color
function adjustBrightness(hex: string, percent: number): string {
  const color = hex.replace('#', '');
  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);
  
  // Multiply by factor (e.g., -30 becomes 0.7, +20 becomes 1.2)
  const factor = 1 + (percent / 100);
  r = Math.max(0, Math.min(255, Math.round(r * factor)));
  g = Math.max(0, Math.min(255, Math.round(g * factor)));
  b = Math.max(0, Math.min(255, Math.round(b * factor)));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Universal Mockup Selector Component
export type PrintifyProductType = 'bella-canvas-3001' | 'gildan-18500' | 'gildan-18000' | 'canvas' | 'tshirt' | 'hoodie' | 'sweatshirt';

interface PrintifyMockupProps {
  productType: PrintifyProductType | string;
  fillColor: string;
  className?: string;
}

export function PrintifyMockup({ productType, fillColor, className = "" }: PrintifyMockupProps) {
  const type = detectPrintifyProductType(productType);
  
  switch (type) {
    case 'bella-canvas-3001':
    case 'tshirt':
      return <BellaCanvas3001Mockup fillColor={fillColor} className={className} />;
    case 'gildan-18500':
    case 'hoodie':
      return <Gildan18500Mockup fillColor={fillColor} className={className} />;
    case 'gildan-18000':
    case 'sweatshirt':
      return <Gildan18000Mockup fillColor={fillColor} className={className} />;
    case 'canvas':
      return <CanvasPrintMockup fillColor={fillColor} className={className} />;
    default:
      return <BellaCanvas3001Mockup fillColor={fillColor} className={className} />;
  }
}

// Helper to detect product type from various input strings
function detectPrintifyProductType(input: string): PrintifyProductType {
  const lower = input.toLowerCase();
  
  // Check for specific product codes/names
  if (lower.includes('bella') && lower.includes('3001')) return 'bella-canvas-3001';
  if (lower.includes('gildan') && lower.includes('18500')) return 'gildan-18500';
  if (lower.includes('gildan') && lower.includes('18000')) return 'gildan-18000';
  
  // Generic type detection
  if (lower.includes('hoodie') || lower.includes('hooded')) return 'gildan-18500';
  if (lower.includes('sweatshirt') || lower.includes('crewneck') || lower.includes('crew neck')) return 'gildan-18000';
  if (lower.includes('canvas') || lower.includes('poster') || lower.includes('print') || lower.includes('wall')) return 'canvas';
  if (lower.includes('tee') || lower.includes('tshirt') || lower.includes('t-shirt') || lower.includes('jersey')) return 'bella-canvas-3001';
  
  // Default to t-shirt
  return 'bella-canvas-3001';
}

// Export helper functions for use elsewhere
export { isLightFill, adjustBrightness, detectPrintifyProductType };

