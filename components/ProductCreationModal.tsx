"use client";

import { useState, useEffect, useCallback, KeyboardEvent } from "react";
import Image from "next/image";
import { PRESETS, PresetType } from "@/lib/image-processing";
import { CatalogProduct } from "@/lib/printify-catalog";
import { PrintifyVariant, PrintifyPrintProvider } from "@/lib/printify";
import ProductBrowser from "./ProductBrowser";
import ColorStylePicker, { ColorStyleSelection } from "./ColorStylePicker";
import AccordionCard from "./AccordionCard";
import { PrintifyMockup, isLightFill, getBellaCanvas3001Image } from "./PrintifyMockups";

interface AIContent {
  title: string;
  description: string;
  tags: string[];
}

interface OrderSettings {
  orderRouting: {
    enabled: boolean;
    threshold: number; // in cents
  };
  orderSubmission: {
    mode: 'manual' | 'auto_1h' | 'auto_24h' | 'auto_immediate';
  };
}

interface ProductCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  variantId: string;
  designUrl: string;
  designName: string;
  onSuccess?: (productId: string) => void;
}

type ConnectedShop = {
  id: string;
  name: string;
  salesChannel?: string;
  isDefault?: boolean;
};

// Helper function to get print area style based on product type
// These values MUST match the SVG print area rectangles in PrintifyMockups.tsx
function getPrintAreaStyle(productType: string, useRealImage: boolean = false): React.CSSProperties {
  const lower = productType.toLowerCase();
  if (lower.includes('hoodie') || lower.includes('18500')) {
    return { top: '26%', left: '50%', transform: 'translateX(-50%)', width: '34%', aspectRatio: '0.9' };
  }
  if (lower.includes('sweatshirt') || lower.includes('18000') || lower.includes('crewneck')) {
    // SVG viewBox 945x726, print area rect at x=338, y=228, width=240, height=274
    // Center: (458, 365) → left: 48.47%, top: 31.4%
    return { top: '31.4%', left: '48.47%', transform: 'translateX(-50%)', width: '25.4%', aspectRatio: '0.876' };
  }
  if (lower.includes('canvas') || lower.includes('poster') || lower.includes('print')) {
    return { top: '6%', left: '50%', transform: 'translateX(-50%)', width: '82%', aspectRatio: '0.85' };
  }
  // T-shirt (Bella Canvas 3001):
  // For REAL images: Image is square with dashed rectangle baked in
  // CRITICAL: All mockup images will follow this format with dashed rectangle at same position
  // Based on actual navy mockup: Rectangle is centered, starts ~23.5% from top, 47% width
  // For SVG fallback: viewBox 773x731, rect at x=252, y=180, width=270, height=328
  if (useRealImage) {
    // Real product image coordinates - MATCHES the dashed rectangle position in mockup PNGs
    // Print area: 23.5% from top, 47% width, centered horizontally
    // Aspect ratio: 0.823 (3951 × 4800 px Printify spec)
    return { top: '23.5%', left: '50%', transform: 'translateX(-50%)', width: '47%', aspectRatio: '0.823' };
  }
  return { top: '24.6%', left: '50%', transform: 'translateX(-50%)', width: '34.9%', aspectRatio: '0.823' };
}

// Helper function to check if a color has a real image available
function hasRealImageForColor(colorName: string, productType: string): boolean {
  const lower = productType.toLowerCase();
  const isTshirt = !lower.includes('hoodie') && !lower.includes('18500') && 
                   !lower.includes('sweatshirt') && !lower.includes('18000') && 
                   !lower.includes('crewneck') && !lower.includes('canvas') && 
                   !lower.includes('poster') && !lower.includes('print');
  return isTshirt && getBellaCanvas3001Image(colorName) !== null;
}

/**
 * Calculate design styles for Step 3 preview that matches both Step 2 and Printify output
 * 
 * This function takes the same position data used in Step 2 (ColorStylePicker) and
 * converts it to CSS styles for the Step 3 preview. The goal is WYSIWYG:
 * - Step 2 preview = Step 3 preview = Printify final product
 * 
 * Position values:
 * - x, y: Percentage offset from center (-50 to +50)
 *   - x=0, y=0 = centered in print area
 *   - x=+25 = 25% to the right of center
 *   - y=-25 = 25% above center (toward top)
 * - scale: Multiplier on 70% base size (default 0.9)
 *   - Final design size = 70% * scale of the print area
 * 
 * CSS rendering:
 * - Design is positioned with its CENTER at the calculated point
 * - `left: calc(50% + x%)` and `top: calc(50% + y%)` with transform: translate(-50%, -50%)
 *   positions the design center at (50% + x%, 50% + y%) of the print area
 */
function getDesignStyles(position: { x: number; y: number; scale: number }) {
  // Calculate design size as percentage of print area
  // Base size is 70% of print area, multiplied by user's scale
  const designSize = 70 * position.scale;
  
  // Position offsets are already in the correct format for CSS calc()
  // x=+25 means move right by 25% of the container
  // y=-25 means move up by 25% of the container (negative = up in CSS)
  const result = {
    xPercent: position.x,  // Percentage offset from center
    yPercent: position.y,  // Percentage offset from center
    designSize: designSize, // Size as percentage of print area (e.g., 63% for default)
  };
  
  return result;
}

/**
 * Get the correct aspect ratio class for mockup thumbnails
 * CRITICAL: Must match the aspect ratios used in ColorStylePicker (Step 2)
 * for consistent WYSIWYG preview between steps.
 * 
 * SVG ViewBox dimensions:
 * - T-shirt: 773x731 = 1.057 aspect ratio (Bella Canvas 3001 detailed mockup)
 *   - Real images: 1:1 (square product photos)
 * - Hoodie: 460x540 = 0.852 aspect ratio
 * - Sweatshirt: 945x726 = 1.302 aspect ratio
 * - Canvas: 400x500 = 0.8 aspect ratio
 */
function getMockupAspectRatio(productType: string, colorName?: string): string {
  const lower = productType.toLowerCase();
  if (lower.includes('hoodie') || lower.includes('18500')) {
    return 'aspect-[460/540]'; // Hoodie aspect ratio
  }
  if (lower.includes('sweatshirt') || lower.includes('18000') || lower.includes('crewneck')) {
    return 'aspect-[945/726]'; // Sweatshirt aspect ratio (wider than tall)
  }
  if (lower.includes('canvas') || lower.includes('poster') || lower.includes('print')) {
    return 'aspect-[400/500]'; // Canvas aspect ratio
  }
  // T-shirt - check if using real image (square) or SVG fallback
  if (colorName && hasRealImageForColor(colorName, productType)) {
    return 'aspect-square'; // Real product photos are square
  }
  return 'aspect-[773/731]'; // SVG mockup aspect ratio
}

// Helper function to get hex color from color name
function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    // Light colors
    'white': '#FFFFFF',
    'natural': '#F5F5DC',
    'cream': '#FFFDD0',
    'sand': '#C2B280',
    'beige': '#F5F5DC',
    'ivory': '#FFFFF0',
    'light pink': '#FFB6C1',
    'pink': '#FFC0CB',
    'light blue': '#ADD8E6',
    'baby blue': '#89CFF0',
    'light gray': '#D3D3D3',
    'light grey': '#D3D3D3',
    'heather gray': '#9FA4A8',
    'heather grey': '#9FA4A8',
    'ash': '#B2BEB5',
    'sport grey': '#878787',
    'ice grey': '#D6D6D6',
    'silver': '#C0C0C0',
    'yellow': '#FFFF00',
    'light yellow': '#FFFFE0',
    'mint': '#98FF98',
    'peach': '#FFCBA4',
    // Dark colors
    'black': '#000000',
    'navy': '#000080',
    'navy blue': '#000080',
    'dark navy': '#1a1a2e',
    'charcoal': '#36454F',
    'dark gray': '#A9A9A9',
    'dark grey': '#A9A9A9',
    'dark heather': '#3A3A3A',
    'forest green': '#228B22',
    'dark green': '#013220',
    'maroon': '#800000',
    'burgundy': '#800020',
    'brown': '#8B4513',
    'dark brown': '#654321',
    'royal blue': '#4169E1',
    'red': '#FF0000',
    'cardinal': '#C41E3A',
    'purple': '#800080',
    'dark purple': '#301934',
    'olive': '#808000',
    'military green': '#4B5320',
  };
  
  const lower = colorName.toLowerCase().trim();
  
  // Direct match
  if (colorMap[lower]) return colorMap[lower];
  
  // Partial match
  for (const [key, value] of Object.entries(colorMap)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
  }
  
  // Default based on common patterns
  if (lower.includes('white') || lower.includes('light') || lower.includes('cream')) {
    return '#FFFFFF';
  }
  if (lower.includes('black') || lower.includes('dark') || lower.includes('navy')) {
    return '#1a1a1a';
  }
  
  // Fallback to gray
  return '#808080';
}

function getPresetForColor(
  colorName: string,
  isLight: boolean,
  selection: ColorStyleSelection | null
): PresetType {
  const presetFromMap = selection?.colorVersions?.get(colorName);
  if (presetFromMap) return presetFromMap;
  return isLight ? (selection?.lightColors.preset || 'original') : (selection?.darkColors.preset || 'invert');
}

// Print Provider Selector with transparency
// Find the Printify Choice provider from a provider list
function findPrintifyChoiceProvider(providers: PrintifyPrintProvider[] | undefined) {
  if (!providers?.length) return undefined;
  return providers.find(p => p.title?.toLowerCase().includes('printify choice'));
}

type Step = 1 | 2 | 3;

interface BlueprintDetails {
  blueprint: CatalogProduct;
  printProviders: PrintifyPrintProvider[];
  variants: PrintifyVariant[];
  selectedProviderId: number | null;
}

export default function ProductCreationModal({
  isOpen,
  onClose,
  variantId,
  designUrl,
  designName,
  onSuccess,
}: ProductCreationModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<CatalogProduct[]>([]);
  const [blueprintDetails, setBlueprintDetails] = useState<Map<number, BlueprintDetails>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeProductId, setActiveProductId] = useState<number | null>(null);
  const [colorStyleSelection, setColorStyleSelection] = useState<ColorStyleSelection | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  // Per-product content state
  const [productContent, setProductContent] = useState<Map<number, { title: string; description: string; tags: string[] }>>(new Map());
  const [tagInput, setTagInput] = useState("");
  const [price, setPrice] = useState(24.99);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [aiContent, setAiContent] = useState<AIContent | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  // Print provider is locked to Printify Choice
  const usePrintifyChoice = true;
  const [shippingProfile, setShippingProfile] = useState<{ name: string; countries?: string[] } | null>(null);
  const [loadingShippingProfile, setLoadingShippingProfile] = useState(false);
  
  // Order Settings state
  const [orderSettings, setOrderSettings] = useState<OrderSettings | null>(null);
  const [loadingOrderSettings, setLoadingOrderSettings] = useState(false);
  const [editingOrderSettings, setEditingOrderSettings] = useState(false);
  const [editedOrderSettings, setEditedOrderSettings] = useState<OrderSettings | null>(null);
  const [savingOrderSettings, setSavingOrderSettings] = useState(false);
  // Store selection + validation
  const [shops, setShops] = useState<ConnectedShop[]>([]);
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [defaultShopId, setDefaultShopId] = useState<string>('');
  const [loadingShops, setLoadingShops] = useState(false);
  const [validationIssues, setValidationIssues] = useState<{ level: 'error' | 'warning'; code: string; message: string; }[]>([]);
  const [validating, setValidating] = useState(false);
  const [syncFields, setSyncFields] = useState({
    title: true,
    description: true,
    images: true,
    variants: true,
    tags: true,
  });
  const baseCost = 9.2;

  const addTagFromInput = useCallback(() => {
    const newTag = tagInput.toLowerCase().trim();
    if (!newTag || newTag.length > 20) return;

    setTags(prev => {
      if (prev.includes(newTag)) return prev;
      return [...prev, newTag].slice(0, 13);
    });
    setTagInput("");
  }, [tagInput]);

  const handleTagKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTagFromInput();
    }
  }, [addTagFromInput]);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  const activeProduct = selectedProducts.find(p => p.id === activeProductId) || selectedProducts[0];
  const activeDetails = activeProduct ? blueprintDetails.get(activeProduct.id) : null;

  useEffect(() => {
    if (isOpen && catalog.length === 0) fetchCatalog();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchShops();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedProducts([]);
      setBlueprintDetails(new Map());
      setActiveProductId(null);
      setColorStyleSelection(null);
      setTitle("");
      setDescription("");
      setTags([]);
      setTagInput("");
      setPrice(24.99);
      setError("");
      setAiContent(null);
      setLoadingAI(false);
      setShowSettings(false);
      setShowVariants(false);
      setShippingProfile(null);
      setLoadingShippingProfile(false);
      setOrderSettings(null);
      setEditingOrderSettings(false);
      setEditedOrderSettings(null);
      setValidationIssues([]);
      setSelectedShopIds([]);
      setDefaultShopId('');
      setSyncFields({
        title: true,
        description: true,
        images: true,
        variants: true,
        tags: true,
      });
    }
  }, [isOpen]);

  // Fetch order settings when entering Step 3
  const fetchOrderSettings = useCallback(async () => {
    if (orderSettings || loadingOrderSettings) return;
    setLoadingOrderSettings(true);
    try {
      const res = await fetch('/api/integrations/printify/order-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setOrderSettings(data.settings);
          setEditedOrderSettings(data.settings);
        }
      }
    } catch (e) {
      console.error('Failed to fetch order settings:', e);
    } finally {
      setLoadingOrderSettings(false);
    }
  }, [orderSettings, loadingOrderSettings]);

  // Save order settings
  const saveOrderSettings = async () => {
    if (!editedOrderSettings) return;
    setSavingOrderSettings(true);
    try {
      const res = await fetch('/api/integrations/printify/order-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedOrderSettings),
      });
      if (res.ok) {
        setOrderSettings(editedOrderSettings);
        setEditingOrderSettings(false);
      }
    } catch (e) {
      console.error('Failed to save order settings:', e);
    } finally {
      setSavingOrderSettings(false);
    }
  };

  const cancelOrderSettingsEdit = () => {
    setEditedOrderSettings(orderSettings);
    setEditingOrderSettings(false);
  };

  const getSubmissionModeLabel = (mode: OrderSettings['orderSubmission']['mode']) => {
    switch (mode) {
      case 'auto_immediate': return 'Auto (Immediate)';
      case 'auto_1h': return 'Auto (1 Hour)';
      case 'auto_24h': return 'Auto (24 Hours)';
      case 'manual': return 'Manual';
      default: return 'Manual';
    }
  };

  useEffect(() => {
    if (selectedProducts.length > 0 && !activeProductId) setActiveProductId(selectedProducts[0].id);
  }, [selectedProducts]);

  useEffect(() => {
    if (selectedProducts.length > 0 && !title) setTitle(designName);
  }, [selectedProducts, designName]);

  const fetchShippingProfile = useCallback(async () => {
    if (!isOpen || step !== 3 || !activeProductId) return;
    const details = blueprintDetails.get(activeProductId);
    const choiceProvider = findPrintifyChoiceProvider(details?.printProviders);
    const providerId = choiceProvider?.id;
    if (!providerId) {
      setShippingProfile(null);
      setError('Printify Choice is not available for this product. Please use a product with Printify Choice support.');
      return;
    }

    setLoadingShippingProfile(true);
    try {
      const res = await fetch(`/api/integrations/printify/shop-settings?blueprintId=${activeProductId}&printProviderId=${providerId}`);
      if (res.ok) {
        const data = await res.json();
        setShippingProfile(data?.settings?.shippingProfile || null);
      } else {
        setShippingProfile(null);
      }
    } catch {
      setShippingProfile(null);
    } finally {
      setLoadingShippingProfile(false);
    }
  }, [isOpen, step, activeProductId, blueprintDetails]);

  useEffect(() => {
    fetchShippingProfile();
  }, [fetchShippingProfile]);

  // Update content when active product changes
  useEffect(() => {
    if (activeProductId) {
      if (productContent.has(activeProductId)) {
        const content = productContent.get(activeProductId)!;
        setTitle(content.title);
        setDescription(content.description);
        setTags(content.tags);
      } else {
        // Generate AI content for this product if we don't have it
        if (step === 3) {
          generateAIContent(activeProductId);
        } else {
          // Initialize with current values
          setProductContent(prev => {
            const newMap = new Map(prev);
            newMap.set(activeProductId, { title: title || designName, description, tags });
            return newMap;
          });
        }
      }
    }
  }, [activeProductId, step]);

  // Save content when it changes
  useEffect(() => {
    if (activeProductId) {
      setProductContent(prev => {
        const newMap = new Map(prev);
        newMap.set(activeProductId, { title, description, tags });
        return newMap;
      });
    }
  }, [title, description, tags, activeProductId]);

  // Generate AI content when entering Step 3 or switching products
  const generateAIContent = useCallback(async (productId?: number) => {
    const targetProductId = productId || activeProductId;
    if (!targetProductId) return;
    
    if (loadingAI) return;
    setLoadingAI(true);
    try {
      const targetProduct = selectedProducts.find(p => p.id === targetProductId);
      const colors = [
        ...(colorStyleSelection?.lightColors.colors || []),
        ...(colorStyleSelection?.darkColors.colors || []),
      ];
      const productType = targetProduct?.subcategory || targetProduct?.title || 'product';
      
      const res = await fetch('/api/ai/product-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designName,
          productType,
          colors,
          platform: 'etsy',
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          // Format description with bullet points if it's too long
          let formattedDescription = data.content.description;
          if (formattedDescription.length > 200) {
            // Try to convert to bullet points
            const sentences = formattedDescription.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
            formattedDescription = sentences.slice(0, 4).map((s: string) => `• ${s.trim()}`).join('\n');
          }
          
          const content = {
            title: data.content.title,
            description: formattedDescription,
            tags: Array.isArray(data.content.tags)
              ? data.content.tags.map(t => String(t).toLowerCase().trim()).filter(t => t.length > 0 && t.length <= 20).slice(0, 13)
              : [],
          };
          
          // Save to product content map
          setProductContent(prev => {
            const newMap = new Map(prev);
            newMap.set(targetProductId, {
              ...content,
              tags: content.tags.map(t => String(t).toLowerCase().trim()).filter(t => t.length > 0 && t.length <= 20).slice(0, 13)
            });
            return newMap;
          });
          
          // Update current fields if this is the active product
          if (targetProductId === activeProductId) {
            setTitle(content.title);
            setDescription(content.description);
            setTags(content.tags);
          }
        }
      }
    } catch (e) {
      console.error('Failed to generate AI content:', e);
    } finally {
      setLoadingAI(false);
    }
  }, [loadingAI, colorStyleSelection, activeProductId, selectedProducts, designName]);

  useEffect(() => {
    if (selectedProducts.length > 0) fetchAllBlueprintDetails();
  }, [selectedProducts]);

  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch("/api/integrations/printify/catalog");
      const data = await res.json();
      if (data.catalog) setCatalog(data.catalog);
    } catch { setError("Failed to load products"); }
    finally { setLoadingCatalog(false); }
  };

  const fetchShops = async () => {
    setLoadingShops(true);
    try {
      const res = await fetch('/api/integrations/printify/status');
      const data = await res.json();
      if (data.connected && data.shops?.length) {
        const mapped = data.shops.map((s: any) => ({
          id: s.id?.toString(),
          name: s.name,
          salesChannel: s.salesChannel,
          isDefault: s.isDefault,
        })) as ConnectedShop[];
        setShops(mapped);
        const ids = mapped.map((s) => s.id).filter(Boolean) as string[];
        setSelectedShopIds(ids);
        setDefaultShopId(data.defaultShopId || mapped.find((s) => s.isDefault)?.id || ids[0] || '');
      } else {
        setShops([]);
        setSelectedShopIds([]);
        setDefaultShopId('');
      }
    } catch (e) {
      console.error('Failed to load shops', e);
      setShops([]);
      setSelectedShopIds([]);
      setDefaultShopId('');
    } finally {
      setLoadingShops(false);
    }
  };

  const fetchAllBlueprintDetails = async () => {
    setLoadingDetails(true);
    const newDetails = new Map(blueprintDetails);
    for (const product of selectedProducts) {
      if (!newDetails.has(product.id)) {
        try {
          const res = await fetch(`/api/integrations/printify/blueprint/${product.id}`);
          if (!res.ok) {
            console.error(`Failed to fetch blueprint ${product.id}:`, res.status, res.statusText);
            continue;
          }
          const data = await res.json();
          console.log('Blueprint data for', product.id, ':', data);
          
          // data.variants is the PrintifyBlueprintVariants object which contains a variants array
          const variantsArray = data.variants?.variants || data.variants || [];
          console.log('Variants array:', variantsArray);
          
          const choiceProvider = findPrintifyChoiceProvider(data.printProviders);
          if (!choiceProvider) {
            setError('Printify Choice is not available for this product. Please select a product with Printify Choice support.');
          }
          
          newDetails.set(product.id, {
            blueprint: product,
            printProviders: data.printProviders || [],
            variants: variantsArray,
            selectedProviderId: choiceProvider?.id || null,
          });
        } catch (err) {
          console.error('Error fetching blueprint details for', product.id, ':', err);
        }
      }
    }
    setBlueprintDetails(newDetails);
    setLoadingDetails(false);
  };

  const runValidation = useCallback(async () => {
    const totalColors = colorStyleSelection ? colorStyleSelection.lightColors.colors.length + colorStyleSelection.darkColors.colors.length : 0;
    const totalSizes = colorStyleSelection?.sizes.length || 0;
    const variantCount = totalColors * totalSizes;
    const mockupCount = totalColors > 0 ? Math.max(1, Math.min(6, totalColors)) : 0;

    setValidating(true);
    try {
      const res = await fetch('/api/products/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          tags,
          price,
          shopIds: selectedShopIds,
          imageCount: mockupCount,
          colorVariantCount: variantCount,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setValidationIssues(data.issues || []);
        return data;
      }

      const fallbackIssues = data.issues || [{ level: 'error', code: 'validation_failed', message: data.error || 'Validation failed' }];
      setValidationIssues(fallbackIssues);
      return { ok: false, issues: fallbackIssues };
    } catch (e) {
      const fallbackIssues = [{ level: 'error', code: 'validation_failed', message: 'Could not run validation. Try again.' }];
      setValidationIssues(fallbackIssues);
      return { ok: false, issues: fallbackIssues };
    } finally {
      setValidating(false);
    }
  }, [colorStyleSelection, title, description, tags, price, selectedShopIds]);

  const handleCreate = async () => {
    if (selectedProducts.length === 0 || !colorStyleSelection) return;
    if (!selectedShopIds.length) {
      setError("Select at least one store to publish to.");
      setStep(3);
      return;
    }
    setCreating(true);
    setError("");
    try {
      const validation = await runValidation();
      if (!validation?.ok) {
        setError("Fix the required fields before publishing.");
        setStep(3);
        return;
      }

      const normalizedTags = tags
        .map(t => String(t).toLowerCase().trim())
        .filter(t => t.length > 0 && t.length <= 20)
        .slice(0, 13);
      const shopsToUse = selectedShopIds;
      const effectiveDefault = shopsToUse.includes(defaultShopId) ? defaultShopId : shopsToUse[0];

      for (const product of selectedProducts) {
        const details = blueprintDetails.get(product.id);
        if (!details) continue;
        const choiceProvider = findPrintifyChoiceProvider(details.printProviders);
        const providerId = choiceProvider?.id || details.selectedProviderId;

        if (!providerId || !choiceProvider) {
          throw new Error('Printify Choice is not available for this product. Please select a product with Printify Choice support.');
        }

        const productTitle = selectedProducts.length === 1 ? title : `${title} - ${product.subcategory || product.title}`;
        
        // Convert colorVersions Map to plain object for JSON serialization
        const colorVersionsObj = colorStyleSelection.colorVersions 
          ? Object.fromEntries(colorStyleSelection.colorVersions)
          : undefined;
        
        console.log('🎨 Creating product with color presets:', {
          lightColors: colorStyleSelection.lightColors.colors,
          lightPreset: colorStyleSelection.lightColors.preset,
          darkColors: colorStyleSelection.darkColors.colors,
          darkPreset: colorStyleSelection.darkColors.preset,
          colorVersions: colorVersionsObj,
        });
        
        const res = await fetch("/api/products/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variantId, 
            blueprintId: product.id, 
            printProviderId: providerId,
            lightColors: { preset: colorStyleSelection.lightColors.preset, colorIds: colorStyleSelection.lightColors.variantIds },
            darkColors: { preset: colorStyleSelection.darkColors.preset, colorIds: colorStyleSelection.darkColors.variantIds },
            sizes: colorStyleSelection.sizeVariantIds, 
            title: productTitle, 
            description, 
            price,
            designPosition: colorStyleSelection.designPosition,
            colorVersions: colorVersionsObj,
            tags: normalizedTags,
            shopIds: shopsToUse,
            defaultShopId: effectiveDefault,
            syncFields,
            usePrintifyChoice,
          }),
        });
        const data = await res.json();
        const hasFailure = data?.results?.some?.((r: any) => !r.success);
        if (!res.ok || hasFailure) throw new Error(data.error || 'Failed to publish to one or more stores');
      }
      setValidationIssues([]);
      onSuccess?.("success");
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setCreating(false); }
  };

  const profit = price - baseCost;
  const profitPercent = price > 0 ? Math.round((profit / price) * 100) : 0;
  const totalColors = colorStyleSelection ? colorStyleSelection.lightColors.colors.length + colorStyleSelection.darkColors.colors.length : 0;
  const totalSizes = colorStyleSelection?.sizes.length || 0;
  const totalVariantsPerProduct = totalColors * totalSizes;
  const grandTotalVariants = totalVariantsPerProduct * selectedProducts.length;

  // Render all available stores as checkboxes + default selector (compact)
  const renderStoreList = () => {
    if (!shops.length) return null;
    return (
      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">Stores</div>
        <div className="flex flex-wrap gap-2">
          {shops.map(shop => {
            const isSelected = selectedShopIds.includes(shop.id);
            return (
              <label
                key={shop.id}
                className={`flex items-center gap-2 px-2.5 py-1.5 border rounded text-xs ${
                  isSelected ? 'border-accent/60 bg-accent/5' : 'border-border bg-secondary/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    setSelectedShopIds(prev => {
                      const next = prev.includes(shop.id)
                        ? prev.filter(id => id !== shop.id)
                        : [...prev, shop.id];
                      const nextDefault = next[0] || '';
                      setDefaultShopId(nextDefault);
                      return next;
                    });
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">{shop.name}</span>
                  <span className="text-[10px] text-muted">{shop.salesChannel || 'Printify'}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop - clicking closes the modal */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${isClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'}`}
        onClick={handleClose} 
      />
      
      {/* Modal Container - slides up from bottom like Airbnb, FULL WIDTH matching page content */}
      <div 
        className={`fixed top-[5vh] bottom-0 left-1/2 -translate-x-1/2 w-full max-w-6xl bg-white dark:bg-surface rounded-t shadow-2xl flex flex-col overflow-hidden z-50 ${isClosing ? 'animate-slide-down-sheet' : 'animate-slide-up-sheet'}`}
      >
        {/* Header - Design focused with clean white background */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-white dark:bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded overflow-hidden bg-white border border-border shadow-sm">
              <Image src={designUrl} alt="" width={40} height={40} className="object-contain w-full h-full" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{designName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`flex items-center gap-1.5 ${s === step ? 'text-accent' : s < step ? 'text-accent/60' : 'text-muted'}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${s === step ? 'bg-accent text-white' : s < step ? 'bg-accent/20' : 'bg-secondary'}`}>
                        {s < step ? '✓' : s}
                      </div>
                      <span className="text-[11px] font-medium hidden sm:inline">
                        {s === 1 ? 'Products' : s === 2 ? 'Configure' : 'Publish'}
                      </span>
                    </div>
                    {s < 3 && <div className={`w-4 h-0.5 mx-1 ${s < step ? 'bg-accent/40' : 'bg-border'}`} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-secondary rounded transition-colors">
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-surface">
          {error && <div className="mx-5 mt-3 p-2 bg-destructive/10 border border-destructive/30 rounded text-destructive text-xs">{error}</div>}

          {/* Step 1 */}
          {step === 1 && (
            <div className="flex-1 overflow-y-auto p-5">
              {loadingCatalog ? <div className="flex justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded" /></div> : <ProductBrowser catalog={catalog} onSelectProducts={setSelectedProducts} selectedProducts={selectedProducts} />}
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white dark:bg-surface">
              {/* Product Tabs with Variant Counts - generous vertical spacing */}
              <div className="shrink-0 px-4 pt-4 pb-3 bg-white dark:bg-surface space-y-3">
                {/* Stores on top */}
                {renderStoreList()}
                {/* Products below */}
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">Products</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedProducts.map(p => {
                      // Calculate variant count for this product
                      const productVariantCount = colorStyleSelection 
                        ? (colorStyleSelection.lightColors.colors.length + colorStyleSelection.darkColors.colors.length) * colorStyleSelection.sizes.length
                        : 0;
                      
                      // Get cleaner product names
                      const getCleanProductName = (product: CatalogProduct) => {
                        const title = (product.title || product.subcategory || '').toLowerCase();
                        if (title.includes('hoodie') || title.includes('18500')) return 'Hoodie';
                        if (title.includes('sweatshirt') || title.includes('18000')) return 'Sweatshirt';
                        if (title.includes('canvas') || title.includes('poster')) return 'Canvas';
                        if (title.includes('shirt') || title.includes('3001') || title.includes('bella')) return 'T-Shirt';
                        return product.subcategory || 'Product';
                      };
                      
                      const productName = getCleanProductName(p);
                      
                      return (
                        <button 
                          key={p.id} 
                          onClick={() => setActiveProductId(p.id)} 
                          className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-all border ${
                            activeProductId === p.id 
                              ? 'bg-accent text-white border-accent shadow-md' 
                              : 'bg-secondary/10 border-border text-foreground hover:border-accent/50 hover:bg-secondary/30'
                          }`}
                        >
                          {p.images[0] && <Image src={p.images[0]} alt="" width={18} height={18} className="rounded" />}
                          <span>{productName}</span>
                          {productVariantCount > 0 && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              activeProductId === p.id 
                                ? 'bg-white/20 text-white' 
                                : 'bg-accent/10 text-accent'
                            }`}>
                              {productVariantCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Color Style Picker - Full Width with generous padding */}
              <div className="flex-1 min-h-0 px-4 py-2 flex items-start justify-center bg-white dark:bg-surface">
                {loadingDetails ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin w-8 h-8 border-3 border-accent border-t-transparent rounded" />
                  </div>
                ) : activeDetails?.variants?.length ? (
                  <div className="w-full h-full">
                    <ColorStylePicker 
                      variants={activeDetails.variants} 
                      designUrl={designUrl} 
                      productType={activeProduct?.subcategory || 'tshirt'} 
                      productId={activeProduct?.id}
                      productTitle={activeProduct?.title}
                      onSelectionChange={setColorStyleSelection} 
                      initialSelection={colorStyleSelection || undefined} 
                    />
                  </div>
                ) : (
                  <p className="text-center text-muted py-10">No variants available</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3 - Publish UI with Accordion Sections */}
          {step === 3 && (
            <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white dark:bg-surface">
              {/* Stores first, products beneath */}
              <div className="shrink-0 px-4 pt-4 pb-2 bg-white dark:bg-surface">
                {renderStoreList()}
              </div>
              {/* Product Tabs at Top */}
              <div className="shrink-0 px-4 pb-3 bg-white dark:bg-surface border-b border-border/50 space-y-2">
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">Products</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedProducts.map(p => {
                    const productVariantCount = colorStyleSelection 
                      ? (colorStyleSelection.lightColors.colors.length + colorStyleSelection.darkColors.colors.length) * colorStyleSelection.sizes.length
                      : 0;
                    
                    const getCleanProductName = (product: CatalogProduct) => {
                      const title = (product.title || product.subcategory || '').toLowerCase();
                      if (title.includes('hoodie') || title.includes('18500')) return 'Hoodie';
                      if (title.includes('sweatshirt') || title.includes('18000')) return 'Sweatshirt';
                      if (title.includes('canvas') || title.includes('poster')) return 'Canvas';
                      if (title.includes('shirt') || title.includes('3001') || title.includes('bella')) return 'T-Shirt';
                      return product.subcategory || 'Product';
                    };
                    
                    return (
                      <button 
                        key={p.id} 
                        onClick={() => setActiveProductId(p.id)} 
                        className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-all ${
                          activeProductId === p.id 
                            ? 'bg-accent text-white shadow-md' 
                            : 'bg-surface border border-border text-foreground hover:border-accent/50 hover:bg-secondary/30'
                        }`}
                      >
                        {p.images[0] && <Image src={p.images[0]} alt="" width={18} height={18} className="rounded" />}
                        <span>{getCleanProductName(p)}</span>
                        {productVariantCount > 0 && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            activeProductId === p.id ? 'bg-white/20 text-white' : 'bg-accent/10 text-accent'
                          }`}>
                            {productVariantCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Content Area with Accordion Sections - Full Width */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-6 space-y-4">
                  {/* Validation status */}
                  {validationIssues.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3l-6.93-12a2 2 0 00-3.48 0l-6.93 12a2 2 0 001.74 3z" />
                          </svg>
                          Readiness checks
                        </div>
                        <span className="text-[11px] text-muted">{validationIssues.filter(i => i.level === 'error').length} blocking • {validationIssues.filter(i => i.level === 'warning').length} warnings</span>
                      </div>
                      <ul className="space-y-1.5">
                        {validationIssues.map((issue, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${issue.level === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/20 text-amber-700 dark:text-amber-200'}`}>
                              {issue.level === 'error' ? '!' : '•'}
                            </span>
                            <span className="text-foreground">{issue.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 1. Mockups Section - ALWAYS VISIBLE (No collapse) */}
                  <div className="bg-surface border border-border rounded p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded bg-indigo-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Mockups</h3>
                        <p className="text-[11px] text-muted">
                          {activeDetails && colorStyleSelection ? (colorStyleSelection.lightColors.colors.length + colorStyleSelection.darkColors.colors.length) : 0} color variants
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {/* Primary mockup - first light color */}
                      {activeDetails && colorStyleSelection?.lightColors.colors[0] && (() => {
                        const colorName = colorStyleSelection.lightColors.colors[0];
                        const colorHex = getColorHex(colorName) || '#FFFFFF';
                        const isLight = isLightFill(colorHex);
                        const preset = getPresetForColor(colorName, isLight, colorStyleSelection);
                        const position = colorStyleSelection.designPosition || { x: 0, y: 0, scale: 0.9 };
                        const { xPercent, yPercent, designSize } = getDesignStyles(position);
                        const productSubcategory = activeProduct?.subcategory || 'tshirt';
                        const useRealImage = hasRealImageForColor(colorName, productSubcategory);
                        const printAreaStyle = getPrintAreaStyle(productSubcategory, useRealImage);
                        const aspectRatioClass = getMockupAspectRatio(productSubcategory, colorName);
                        return (
                          <div className="relative group w-full">
                            {/* CRITICAL: Match Step 2 container setup exactly for WYSIWYG */}
                            <div className={`${aspectRatioClass} w-full bg-secondary/30 rounded overflow-hidden border-2 border-accent shadow-md`}>
                              <div className="w-full h-full relative bg-white dark:bg-surface flex items-center justify-center">
                                <div className="w-full h-full relative">
                                  <PrintifyMockup 
                                    productType={activeProduct?.subcategory || 'tshirt'} 
                                    fillColor={colorHex}
                                  />
                                </div>
                                {/* Print area container - MUST match Step 2 exactly */}
                                <div className="absolute pointer-events-none" style={printAreaStyle}>
                                  {/* Design positioned within print area - EXACT same as Step 2 */}
                                  <div 
                                    className="absolute"
                                    style={{
                                      left: `calc(50% + ${xPercent}%)`,
                                      top: `calc(50% + ${yPercent}%)`,
                                      width: `${designSize}%`,
                                      height: `${designSize}%`,
                                      transform: 'translate(-50%, -50%)',
                                    }}
                                  >
                                    <Image 
                                      src={designUrl} 
                                      alt="Design" 
                                      fill 
                                      className="object-contain" 
                                      style={{ filter: PRESETS[preset].cssFilter }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="absolute top-2 right-2">
                              <span className="px-2 py-0.5 bg-accent text-white text-[10px] font-bold rounded shadow-sm">
                                Primary
                              </span>
                            </div>
                            <p className="text-[10px] text-center text-muted mt-1.5 truncate font-medium">{colorName}</p>
                          </div>
                        );
                      })()}
                      
                      {/* Additional mockups - show 1-2 more */}
                      {activeDetails && colorStyleSelection?.lightColors.colors.slice(1, 3).map((colorName, i) => {
                        const colorHex = getColorHex(colorName) || '#FFFFFF';
                        const isLight = isLightFill(colorHex);
                        const preset = getPresetForColor(colorName, isLight, colorStyleSelection);
                        const position = colorStyleSelection.designPosition || { x: 0, y: 0, scale: 0.9 };
                        const { xPercent, yPercent, designSize } = getDesignStyles(position);
                        const productSubcategory = activeProduct?.subcategory || 'tshirt';
                        const useRealImage = hasRealImageForColor(colorName, productSubcategory);
                        const printAreaStyle = getPrintAreaStyle(productSubcategory, useRealImage);
                        const aspectRatioClass = getMockupAspectRatio(productSubcategory, colorName);
                        return (
                          <div key={`light-${i + 1}`} className="relative">
                            <div className={`${aspectRatioClass} w-full bg-secondary/30 rounded overflow-hidden border border-border`}>
                              <div className="w-full h-full relative bg-white dark:bg-surface flex items-center justify-center">
                                <div className="w-full h-full relative">
                                  <PrintifyMockup 
                                    productType={activeProduct?.subcategory || 'tshirt'} 
                                    fillColor={colorHex}
                                  />
                                </div>
                                {/* Print area container - matches Step 2 positioning */}
                                <div className="absolute pointer-events-none" style={printAreaStyle}>
                                  {/* Design positioned within print area using percentage offsets */}
                                  <div 
                                    className="absolute"
                                    style={{
                                      left: `calc(50% + ${xPercent}%)`,
                                      top: `calc(50% + ${yPercent}%)`,
                                      width: `${designSize}%`,
                                      height: `${designSize}%`,
                                      transform: 'translate(-50%, -50%)',
                                    }}
                                  >
                                    <Image 
                                      src={designUrl} 
                                      alt="Design" 
                                      fill 
                                      className="object-contain" 
                                      style={{ filter: PRESETS[preset].cssFilter }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-[10px] text-center text-muted mt-1.5 truncate">{colorName}</p>
                          </div>
                        );
                      })}
                      
                      {/* Show first dark color if no more light colors */}
                      {activeDetails && !colorStyleSelection?.lightColors.colors[1] && colorStyleSelection?.darkColors.colors[0] && (() => {
                        const colorName = colorStyleSelection.darkColors.colors[0];
                        const colorHex = getColorHex(colorName) || '#1a1a1a';
                        const isLight = isLightFill(colorHex);
                        const preset = getPresetForColor(colorName, isLight, colorStyleSelection);
                        const position = colorStyleSelection.designPosition || { x: 0, y: 0, scale: 0.9 };
                        const { xPercent, yPercent, designSize } = getDesignStyles(position);
                        const productSubcategory = activeProduct?.subcategory || 'tshirt';
                        const useRealImage = hasRealImageForColor(colorName, productSubcategory);
                        const printAreaStyle = getPrintAreaStyle(productSubcategory, useRealImage);
                        const aspectRatioClass = getMockupAspectRatio(productSubcategory, colorName);
                        return (
                          <div className="relative">
                            <div className={`${aspectRatioClass} w-full bg-secondary/30 rounded overflow-hidden border border-border`}>
                              <div className="w-full h-full relative bg-white dark:bg-surface flex items-center justify-center">
                                <div className="w-full h-full relative">
                                  <PrintifyMockup 
                                    productType={activeProduct?.subcategory || 'tshirt'} 
                                    fillColor={colorHex}
                                  />
                                </div>
                                {/* Print area container - matches Step 2 positioning */}
                                <div className="absolute pointer-events-none" style={printAreaStyle}>
                                  {/* Design positioned within print area using percentage offsets */}
                                  <div 
                                    className="absolute"
                                    style={{
                                      left: `calc(50% + ${xPercent}%)`,
                                      top: `calc(50% + ${yPercent}%)`,
                                      width: `${designSize}%`,
                                      height: `${designSize}%`,
                                      transform: 'translate(-50%, -50%)',
                                    }}
                                  >
                                    <Image 
                                      src={designUrl} 
                                      alt="Design" 
                                      fill 
                                      className="object-contain" 
                                      style={{ filter: PRESETS[preset].cssFilter }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-[10px] text-center text-muted mt-1.5 truncate">{colorName}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 2. Listing Details Section - Collapsible (Collapsed by default) */}
                  <AccordionCard
                    title="Listing Details"
                    subtitle="AI-generated content"
                    icon={
                      <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    }
                    iconBgColor="bg-violet-500/10"
                    summary={title || 'Title, description, and tags'}
                    defaultOpen={false}
                    badge={loadingAI ? (
                      <span className="flex items-center gap-1 text-[10px] text-violet-600">
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating...
                      </span>
                    ) : undefined}
                  >
                    <div className="space-y-4">
                      {/* Title */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-medium text-foreground/80">Title</label>
                          {!loadingAI && aiContent && (
                            <button 
                              onClick={() => generateAIContent()} 
                              className="text-[10px] text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Regenerate All
                            </button>
                          )}
                        </div>
                        <input 
                          type="text" 
                          value={title} 
                          onChange={e => setTitle(e.target.value)} 
                          placeholder={loadingAI ? "Generating title..." : "Product title"} 
                          className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-colors" 
                        />
                      </div>
                      
                      {/* Description */}
                      <div>
                        <label className="block text-xs font-medium text-foreground/80 mb-1.5">Description</label>
                        <textarea 
                          value={description} 
                          onChange={e => setDescription(e.target.value)} 
                          rows={6} 
                          placeholder={loadingAI ? "Generating description..." : "Write a concise product description with bullet points..."} 
                          className="w-full px-3 py-2.5 bg-background border border-border rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-colors font-mono text-xs" 
                        />
                        <p className="text-[10px] text-muted mt-1.5">
                          💡 Tip: Use bullet points (•) for better readability. Keep it concise!
                        </p>
                      </div>
                      
                      {/* Tags - Optional */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-medium text-foreground/80">
                            Tags <span className="font-normal text-muted">(optional, helps Etsy SEO)</span>
                          </label>
                          <span className="text-[10px] text-muted">{tags.length}/13</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            placeholder="Add a tag and press Enter (comma-separated, auto-lowercased)"
                            className="flex-1 px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-colors"
                          />
                          <button
                            onClick={addTagFromInput}
                            className="px-3 py-2 bg-secondary rounded text-xs font-semibold hover:bg-secondary/80 transition-colors"
                            type="button"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2 p-2.5 bg-background border border-border rounded min-h-[52px]">
                          {tags.map((tag, i) => (
                            <span 
                              key={i} 
                              className="inline-flex items-center gap-1 px-2 py-1 bg-violet-500/10 text-violet-700 dark:text-violet-300 rounded text-xs"
                            >
                              {tag}
                              <button 
                                onClick={() => setTags(tags.filter((_, idx) => idx !== i))} 
                                className="hover:text-violet-900 dark:hover:text-violet-100"
                                type="button"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          {tags.length === 0 && !loadingAI && (
                            <span className="text-xs text-muted">Add comma-separated tags (optional)</span>
                          )}
                          {loadingAI && tags.length === 0 && (
                            <span className="text-xs text-muted">Generating tags...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionCard>

                  {/* 4. Pricing Section - Collapsible */}
                  <AccordionCard
                    title="Pricing"
                    subtitle={`$${price.toFixed(2)} retail • $${profit.toFixed(2)} profit • ${profitPercent}% margin`}
                    icon={
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                    iconBgColor="bg-emerald-500/10"
                    summary={`${grandTotalVariants} variants • $${(profit * grandTotalVariants).toFixed(0)} potential revenue`}
                  >
                    <div className="space-y-4">
                      {/* Price Input Section */}
                      <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-accent/10 border border-emerald-500/20 rounded">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-medium text-foreground/80">Set Your Retail Price</label>
                          <div className="flex items-center gap-1 text-xs text-muted">
                            <span>Base: ${baseCost.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">$</span>
                            <input 
                              type="number" 
                              value={price} 
                              onChange={e => setPrice(parseFloat(e.target.value) || 0)} 
                              className="w-full pl-7 pr-3 py-3 bg-background border-2 border-accent/30 rounded text-xl font-bold focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors" 
                              step="0.01"
                              min={baseCost}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => setPrice(p => p + 1)} className="w-8 h-7 bg-secondary hover:bg-secondary/80 rounded text-xs font-bold transition-colors flex items-center justify-center">+</button>
                            <button onClick={() => setPrice(p => Math.max(baseCost, p - 1))} className="w-8 h-7 bg-secondary hover:bg-secondary/80 rounded text-xs font-bold transition-colors flex items-center justify-center">-</button>
                          </div>
                        </div>
                      </div>

                      {/* Profit Breakdown */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 bg-secondary/20 rounded text-center">
                          <div className="text-[10px] text-muted mb-1">Base Cost</div>
                          <div className="text-sm font-bold text-foreground">${baseCost.toFixed(2)}</div>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded text-center border border-emerald-500/20">
                          <div className="text-[10px] text-emerald-600 mb-1">Your Profit</div>
                          <div className="text-sm font-bold text-emerald-600">${profit.toFixed(2)}</div>
                        </div>
                        <div className="p-3 bg-secondary/20 rounded text-center">
                          <div className="text-[10px] text-muted mb-1">Margin</div>
                          <div className="text-sm font-bold text-foreground">{profitPercent}%</div>
                        </div>
                      </div>

                      {/* Variant & Revenue Details */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-secondary/20 rounded">
                          <div className="text-[10px] text-muted mb-1">Total Variants</div>
                          <div className="text-lg font-bold text-foreground">{grandTotalVariants}</div>
                          <div className="text-[10px] text-muted mt-1">
                            {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} × {totalColors} colors × {totalSizes} sizes
                          </div>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-accent/10 border border-emerald-500/20 rounded">
                          <div className="text-[10px] text-muted mb-1">Potential Revenue</div>
                          <div className="text-lg font-bold text-emerald-600">${(profit * grandTotalVariants).toFixed(0)}</div>
                          <div className="text-[10px] text-muted mt-1">if all variants sell once</div>
                        </div>
                      </div>

                      {/* Price Per Variant */}
                      <div className="p-3 bg-secondary/10 rounded border border-border/50">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted">Price per variant</span>
                          <span className="font-medium text-foreground">${price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-muted">Profit per variant</span>
                          <span className="font-medium text-emerald-600">${profit.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </AccordionCard>

                  {/* 3. Fulfillment Section - Collapsible */}
                  <AccordionCard
                    title="Fulfillment"
                subtitle="Printify Choice"
                    icon={
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    }
                    iconBgColor="bg-blue-500/10"
                    summary={shippingProfile?.name || 'Shop default shipping profile'}
                  >
                    <div className="space-y-4">
                      <div className="p-3 bg-secondary/20 rounded">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs text-muted">POD platform</span>
                            <div className="mt-0.5 text-sm font-semibold text-foreground">Printify</div>
                          </div>
                          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold rounded">
                        Auto
                          </span>
                        </div>
                        <div className="mt-3">
                          <span className="text-xs text-muted">Print provider</span>
                      <div className="mt-1 text-sm font-semibold text-foreground flex items-center gap-2">
                        <span>Printify Choice</span>
                        <span className="px-1 py-0.5 bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[9px] font-bold rounded">
                          ⚡ Auto
                        </span>
                          </div>
                      <p className="text-[10px] text-muted mt-1">
                        Optimized routing for faster production and delivery. Provider selection is locked to Printify Choice.
                      </p>
                      {activeDetails && !findPrintifyChoiceProvider(activeDetails.printProviders) && (
                        <p className="text-[10px] text-destructive mt-1">
                          Printify Choice is not available for this product. Choose a different product that supports Printify Choice.
                        </p>
                      )}
                    </div>
                      </div>

                      <div className="p-3 bg-secondary/20 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted">Etsy shipping</span>
                          {loadingShippingProfile && (
                            <svg className="w-4 h-4 animate-spin text-muted" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {shippingProfile?.name || 'Using shop default shipping profile'}
                        </p>
                        <p className="text-[10px] text-muted mt-1">
                          Auto-filled from your shop defaults. Processing and delivery estimates follow the selected provider.
                        </p>
                        {shippingProfile?.countries?.length ? (
                          <p className="text-[10px] text-muted mt-1">
                            Ships to: {shippingProfile.countries.join(', ')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </AccordionCard>

                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Sticky at bottom with generous spacing */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-border bg-secondary/20 shrink-0 mt-auto">
          <div className="text-sm text-muted">
            {step === 1 && selectedProducts.length > 0 && `${selectedProducts.length} product${selectedProducts.length > 1 ? 's' : ''} selected`}
            {step === 3 && `${grandTotalVariants} variants will be created`}
          </div>
          <div className="flex items-center gap-3">
            {step > 1 && <button onClick={() => setStep(s => (s - 1) as Step)} className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-secondary/50 rounded transition-colors">← Back</button>}
            {step < 3 ? (
              <button 
                onClick={() => {
                  const nextStep = (step + 1) as Step;
                  setStep(nextStep);
                  if (nextStep === 3) {
                    if (activeProductId) {
                      generateAIContent(activeProductId);
                    }
                    fetchOrderSettings();
                  }
                }} 
                disabled={(step === 1 && (selectedProducts.length === 0 || loadingDetails)) || (step === 2 && !colorStyleSelection)} 
                className="px-6 py-2.5 bg-accent text-white text-sm font-semibold rounded disabled:opacity-50 hover:bg-accent/90 transition-colors"
              >
                {loadingDetails ? 'Loading...' : 'Next →'}
              </button>
            ) : (
              <button onClick={handleCreate} disabled={creating || !title} className="px-6 py-2.5 bg-[#29b474] text-white text-sm font-semibold rounded disabled:opacity-50 flex items-center gap-2 hover:bg-[#24a366] transition-colors">
                {creating ? <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Creating...</> : <>✓ Create {selectedProducts.length > 1 ? `${selectedProducts.length} Products` : 'Product'}</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BatchProductCreationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50" onClick={onClose} /><div className="relative bg-surface rounded p-6 text-center max-w-sm"><h2 className="font-bold mb-2">Batch Create</h2><p className="text-muted text-sm mb-4">Coming soon!</p><button onClick={onClose} className="px-4 py-2 bg-secondary rounded">Close</button></div></div>;
}
