// backend/queues/processors/thumbnailProcessor.js
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';

export async function processThumbnailJob(job) {
  const { originalImageUrl, designId, sizes = [150, 300, 600] } = job.data;
  
  console.log(`[ThumbnailProcessor] Generating thumbnails for design ${designId}`);

  try {
    const thumbnails = {};
    
    // Download original image
    const response = await fetch(originalImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Generate thumbnails for each size
    for (const size of sizes) {
      const thumbnail = await sharp(imageBuffer)
        .resize(size, size, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      // Upload to Cloudinary if configured
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: 'thumbnails',
              public_id: `${designId}_${size}x${size}`,
              resource_type: 'image',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(thumbnail);
        });
        
        thumbnails[`${size}x${size}`] = uploadResult.secure_url;
        console.log(`[ThumbnailProcessor] Uploaded ${size}x${size} thumbnail: ${uploadResult.secure_url}`);
      } else {
        // Simulate upload without Cloudinary
        thumbnails[`${size}x${size}`] = `simulated://thumbnail-${designId}-${size}x${size}.jpg`;
        console.log(`[ThumbnailProcessor] Simulated ${size}x${size} thumbnail for design ${designId}`);
      }
    }
    
    console.log(`[ThumbnailProcessor] Completed thumbnails for design ${designId}:`, Object.keys(thumbnails));
    return { designId, thumbnails };
    
  } catch (error) {
    console.error(`[ThumbnailProcessor] Failed to generate thumbnails for design ${designId}:`, error.message);
    throw error;
  }
}