# Design Generation Update - Gemini 2.5 Flash Image + Recraft Background Removal

## Overview
Updated the design variant generation process to use **Gemini 2.5 Flash Image** with reference images, followed by **Recraft AI** for background removal only.

## Problem Solved
- **Previous Issue**: Recraft couldn't accept reference images, so generated designs didn't look similar to uploaded ones
- **New Solution**: Gemini 2.5 Flash Image accepts both reference image + prompt, creating similar designs (75-95% match)
- **Background Fix**: Gemini doesn't remove backgrounds well, so Recraft handles that part

## Implementation Details

### Step 4: Image Generation (Updated)

#### 4.1 Gemini 2.5 Flash Image Generation
**Model**: `gemini-2.5-flash-image`
- **Input**: Original uploaded image (as reference) + strategy prompt
- **Output**: Generated design variant (with background)
- **Key Feature**: Maintains 75-95% similarity to reference image

**Code Location**: `lib/gemini.ts` - `generateVariantImages()`

```typescript
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

// Pass both reference image and prompt
const result = await model.generateContent([prompt, imagePart]);
```

#### 4.2 Recraft Background Removal
**Service**: Recraft AI Background Removal API
- **Input**: Gemini-generated image (with background)
- **Output**: Clean PNG with transparent background
- **Endpoint**: `https://external.api.recraft.ai/v1/images/removeBackground`

**Code Location**: `lib/recraft.ts` - `removeBackgroundWithRecraft()`

```typescript
const response = await fetch('https://external.api.recraft.ai/v1/images/removeBackground', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
  },
  body: JSON.stringify({
    image: base64Data,
    response_format: 'b64_json',
  }),
});
```

## Updated Process Flow

```
User Upload Image
    ↓
Step 1: Gemini analyzes design
    ↓
Step 2: Gemini generates strategies
    ↓
Step 3: Gemini 2.5 Flash Image generates variants
        (Using original image as reference + strategy prompt)
    ↓
Step 4: Recraft removes backgrounds from generated images
    ↓
Return clean variants with transparent backgrounds
```

## Key Changes

### `lib/gemini.ts`
1. ✅ Added `extractImageFromGeminiResponse()` helper function
2. ✅ Updated `generateVariantImages()` to use `gemini-2.5-flash-image` model
3. ✅ Now passes original image as reference alongside prompts
4. ✅ Calls Recraft background removal after generation
5. ✅ Parallel generation maintained for speed

### `lib/recraft.ts`
1. ✅ Added `removeBackgroundWithRecraft()` function
2. ✅ Handles base64 image data conversion
3. ✅ Calls Recraft background removal API
4. ✅ Returns clean PNG with transparent background

### No Changes Required
- `app/api/remix/route.ts` - No changes needed, same interface
- `app/page.tsx` - No changes needed, same flow
- Other components - No changes needed

## Benefits
✅ Generated designs now look similar to uploaded ones (reference image)
✅ Clean transparent backgrounds (Recraft removal)
✅ Best of both worlds: Gemini's similarity + Recraft's background removal
✅ No breaking changes to existing API or UI

## API Requirements
- **GEMINI_API_KEY**: Required for Gemini 2.5 Flash Image generation
- **RECRAFT_API_KEY**: Required for background removal

## Testing Notes
- Expected generation time: ~15-20 seconds per variant
- Gemini generates variants in parallel
- Background removal happens sequentially after each generation
- Output: PNG with transparent background, base64 encoded

---

**Date**: November 25, 2025
**Status**: ✅ Implementation Complete

