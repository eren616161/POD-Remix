import { createClient } from '@/lib/supabase/client'
import type { ProjectInsert, VariantInsert } from '@/lib/supabase/types'

interface Variant {
  id: number;
  strategy: string;
  design: {
    imageData: string;  // Can be URL or base64
    imageUrl?: string;  // Explicit URL field (preferred)
    thumbnailUrl?: string;  // Thumbnail URL for fast loading
    prompt: string;
  };
  colorClassification?: {
    recommendedBackground: 'light' | 'dark';
    productHint: string;
  };
}

interface SaveProjectParams {
  userId: string;
  originalImage: string;
  variants: Variant[];
  projectName: string;
}

interface SaveProjectResult {
  projectId: string;
  success: boolean;
  error?: string;
}

/**
 * Check if a string is a URL (not base64)
 */
function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://');
}

/**
 * Convert base64 data URL to Blob
 */
function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Note: Bucket existence check removed - it requires permissions that
 * may not be available. The bucket should be pre-created in Supabase.
 * If the bucket doesn't exist, the upload will fail with a clear error.
 */

/**
 * Upload an image to Supabase Storage
 */
async function uploadImage(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
  imageData: string
): Promise<string> {
  const blob = dataURLtoBlob(imageData);
  
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    // Provide more helpful error messages
    if (error.message.includes('row-level security')) {
      throw new Error(
        `Storage RLS policy error. Please add storage policies in Supabase. See supabase-setup.sql for required policies.`
      );
    }
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * Save a complete project with original image and all variants
 */
export async function saveProject({
  userId,
  originalImage,
  variants,
  projectName,
}: SaveProjectParams): Promise<SaveProjectResult> {
  const supabase = createClient();
  
  try {
    // Generate a unique project ID
    const projectId = crypto.randomUUID();
    const bucket = 'design-images';
    
    // 1. Upload original image
    const originalPath = `originals/${userId}/${projectId}.png`;
    const originalUrl = await uploadImage(supabase, bucket, originalPath, originalImage);
    
    // 2. Upload variant images in parallel (including thumbnails)
    // Note: imageData may already be a URL from the remix API (Supabase Storage)
    const variantUploadPromises = variants.map(async (variant) => {
      // Use explicit imageUrl if available, otherwise use imageData
      const imageSource = variant.design.imageUrl || variant.design.imageData;
      const thumbnailSource = variant.design.thumbnailUrl;
      
      // If already a URL (from remix API), we can use it directly
      // The temp images are already in Supabase Storage, so we just need to copy to permanent location
      if (isUrl(imageSource)) {
        // For URLs, we need to download and re-upload to permanent location
        // This moves from temp/ to variants/ for proper organization
        try {
          const response = await fetch(imageSource);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          const variantPath = `variants/${userId}/${projectId}_v${variant.id}.png`;
          const { error } = await supabase.storage
            .from(bucket)
            .upload(variantPath, buffer, {
              contentType: 'image/png',
              upsert: true,
            });
          
          if (error) {
            console.warn(`Failed to copy variant ${variant.id} to permanent storage, using temp URL:`, error);
            return { ...variant, imageUrl: imageSource, thumbnailUrl: thumbnailSource || imageSource };
          }
          
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(variantPath);
          
          // Also copy thumbnail to permanent storage if available
          let permanentThumbnailUrl = urlData.publicUrl; // Fallback to full image
          if (thumbnailSource && isUrl(thumbnailSource)) {
            try {
              const thumbResponse = await fetch(thumbnailSource);
              const thumbBlob = await thumbResponse.blob();
              const thumbArrayBuffer = await thumbBlob.arrayBuffer();
              const thumbBuffer = Buffer.from(thumbArrayBuffer);
              
              const thumbnailPath = `variants/${userId}/${projectId}_v${variant.id}_thumb.webp`;
              const { error: thumbError } = await supabase.storage
                .from(bucket)
                .upload(thumbnailPath, thumbBuffer, {
                  contentType: 'image/webp',
                  upsert: true,
                });
              
              if (!thumbError) {
                const { data: thumbUrlData } = supabase.storage
                  .from(bucket)
                  .getPublicUrl(thumbnailPath);
                permanentThumbnailUrl = thumbUrlData.publicUrl;
              }
            } catch (thumbErr) {
              console.warn(`Failed to copy thumbnail ${variant.id}, using full image URL`);
            }
          }
          
          return { ...variant, imageUrl: urlData.publicUrl, thumbnailUrl: permanentThumbnailUrl };
        } catch (err) {
          console.warn(`Failed to process variant ${variant.id} URL, using original:`, err);
          return { ...variant, imageUrl: imageSource, thumbnailUrl: thumbnailSource || imageSource };
        }
      } else {
        // Original base64 upload path (fallback for old behavior)
        const variantPath = `variants/${userId}/${projectId}_v${variant.id}.png`;
        const variantUrl = await uploadImage(supabase, bucket, variantPath, imageSource);
        return { ...variant, imageUrl: variantUrl, thumbnailUrl: variantUrl };
      }
    });
    
    const uploadedVariants = await Promise.all(variantUploadPromises);
    
    // 3. Insert project record
    const projectRecord: ProjectInsert = {
      id: projectId,
      user_id: userId,
      name: projectName,
      original_image_url: originalUrl,
    };
    
    const { error: projectError } = await supabase
      .from('projects')
      .insert(projectRecord as never);
    
    if (projectError) {
      throw new Error(`Failed to save project: ${projectError.message}`);
    }
    
    // 4. Insert variant records (batch_number defaults to 1 for initial generation)
    const variantRecords: VariantInsert[] = uploadedVariants.map((variant) => ({
      project_id: projectId,
      user_id: userId,  // Include user_id for optimized RLS
      variant_number: variant.id,
      batch_number: 1,
      strategy: variant.strategy,
      image_url: variant.imageUrl,
      thumbnail_url: variant.thumbnailUrl || null,
      recommended_background: variant.colorClassification?.recommendedBackground || 'light',
      product_hint: variant.colorClassification?.productHint || null,
    }));
    
    const { error: variantsError } = await supabase
      .from('variants')
      .insert(variantRecords as never);
    
    if (variantsError) {
      // Try to clean up the project if variants failed
      await supabase.from('projects').delete().eq('id', projectId);
      throw new Error(`Failed to save variants: ${variantsError.message}`);
    }
    
    return {
      projectId,
      success: true,
    };
  } catch (error) {
    console.error('Error saving project:', error);
    return {
      projectId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Save regenerated variants to an existing project
 * Creates a new batch of variants without deleting existing ones
 */
interface SaveRegeneratedVariantsParams {
  projectId: string;
  userId: string;
  variants: Variant[];
  batchNumber: number;
}

export async function saveRegeneratedVariants({
  projectId,
  userId,
  variants,
  batchNumber,
}: SaveRegeneratedVariantsParams): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const bucket = 'design-images';
  
  try {
    // Upload variant images in parallel (including thumbnails)
    const variantUploadPromises = variants.map(async (variant) => {
      const imageSource = variant.design.imageUrl || variant.design.imageData;
      const thumbnailSource = variant.design.thumbnailUrl;
      
      // Use batch number in the file path to avoid overwriting existing variants
      const variantPath = `variants/${userId}/${projectId}_b${batchNumber}_v${variant.id}.png`;
      
      if (isUrl(imageSource)) {
        try {
          const response = await fetch(imageSource);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          const { error } = await supabase.storage
            .from(bucket)
            .upload(variantPath, buffer, {
              contentType: 'image/png',
              upsert: true,
            });
          
          if (error) {
            console.warn(`Failed to upload variant ${variant.id} batch ${batchNumber}:`, error);
            return { ...variant, imageUrl: imageSource, thumbnailUrl: thumbnailSource || imageSource };
          }
          
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(variantPath);
          
          // Also copy thumbnail to permanent storage if available
          let permanentThumbnailUrl = urlData.publicUrl;
          if (thumbnailSource && isUrl(thumbnailSource)) {
            try {
              const thumbResponse = await fetch(thumbnailSource);
              const thumbBlob = await thumbResponse.blob();
              const thumbArrayBuffer = await thumbBlob.arrayBuffer();
              const thumbBuffer = Buffer.from(thumbArrayBuffer);
              
              const thumbnailPath = `variants/${userId}/${projectId}_b${batchNumber}_v${variant.id}_thumb.webp`;
              const { error: thumbError } = await supabase.storage
                .from(bucket)
                .upload(thumbnailPath, thumbBuffer, {
                  contentType: 'image/webp',
                  upsert: true,
                });
              
              if (!thumbError) {
                const { data: thumbUrlData } = supabase.storage
                  .from(bucket)
                  .getPublicUrl(thumbnailPath);
                permanentThumbnailUrl = thumbUrlData.publicUrl;
              }
            } catch (thumbErr) {
              console.warn(`Failed to copy thumbnail ${variant.id}`);
            }
          }
          
          return { ...variant, imageUrl: urlData.publicUrl, thumbnailUrl: permanentThumbnailUrl };
        } catch (err) {
          console.warn(`Failed to process variant ${variant.id}:`, err);
          return { ...variant, imageUrl: imageSource, thumbnailUrl: thumbnailSource || imageSource };
        }
      } else {
        const variantUrl = await uploadImage(supabase, bucket, variantPath, imageSource);
        return { ...variant, imageUrl: variantUrl, thumbnailUrl: variantUrl };
      }
    });
    
    const uploadedVariants = await Promise.all(variantUploadPromises);
    
    // Insert variant records with the new batch number
    const variantRecords: VariantInsert[] = uploadedVariants.map((variant) => ({
      project_id: projectId,
      user_id: userId,  // Include user_id for optimized RLS
      variant_number: variant.id,
      batch_number: batchNumber,
      strategy: variant.strategy,
      image_url: variant.imageUrl,
      thumbnail_url: variant.thumbnailUrl || null,
      recommended_background: variant.colorClassification?.recommendedBackground || 'light',
      product_hint: variant.colorClassification?.productHint || null,
    }));
    
    const { error: variantsError } = await supabase
      .from('variants')
      .insert(variantRecords as never);
    
    if (variantsError) {
      throw new Error(`Failed to save regenerated variants: ${variantsError.message}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving regenerated variants:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a project and all its images
 */
export async function deleteProject(projectId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const bucket = 'design-images';
  
  try {
    // Delete images from storage
    const originalPath = `originals/${userId}/${projectId}.png`;
    const variantPaths = [1, 2, 3, 4].map(n => `variants/${userId}/${projectId}_v${n}.png`);
    
    // Delete all images (ignore errors for missing files)
    await supabase.storage.from(bucket).remove([originalPath, ...variantPaths]);
    
    // Delete project record (variants will cascade delete)
    const { error } = await (supabase
      .from('projects') as ReturnType<typeof supabase.from>)
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all projects for a user
 */
export async function getUserProjects(userId: string) {
  const supabase = createClient();
  
  const { data, error } = await (supabase
    .from('projects') as ReturnType<typeof supabase.from>)
    .select(`
      *,
      variants (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }
  
  return data;
}

/**
 * Get a single project with its variants
 */
export async function getProject(projectId: string, userId: string) {
  const supabase = createClient();
  
  const { data, error } = await (supabase
    .from('projects') as ReturnType<typeof supabase.from>)
    .select(`
      *,
      variants (*)
    `)
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  
  if (error) {
    throw new Error(`Failed to fetch project: ${error.message}`);
  }
  
  return data;
}

