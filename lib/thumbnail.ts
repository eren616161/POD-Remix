import sharp from 'sharp';

/**
 * Create a thumbnail from a base64 data URL
 * Returns a WebP buffer optimized for fast loading
 */
export async function createThumbnail(
  imageData: string,
  maxSize: number = 400
): Promise<Buffer> {
  // Extract base64 data from data URL
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  const inputBuffer = Buffer.from(base64Data, 'base64');

  // Resize and convert to WebP
  const thumbnail = await sharp(inputBuffer)
    .resize(maxSize, maxSize, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();

  return thumbnail;
}

/**
 * Create a thumbnail from a Buffer
 */
export async function createThumbnailFromBuffer(
  inputBuffer: Buffer,
  maxSize: number = 400
): Promise<Buffer> {
  const thumbnail = await sharp(inputBuffer)
    .resize(maxSize, maxSize, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();

  return thumbnail;
}

