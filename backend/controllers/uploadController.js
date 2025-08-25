import cloudinary from 'cloudinary';
import dotenv from 'dotenv';
import { MAX_PRINTFILE_DECODED_MB } from '../config/constants.js';
import { sendError } from '../utils/sendError.js';

dotenv.config();

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to extract base64 from data URL or return as-is
function extractBase64(input) {
  if (!input) return null;
  
  // If it's a data URL, extract the base64 part
  if (input.startsWith('data:')) {
    const parts = input.split(',');
    return parts.length > 1 ? parts[1] : null;
  }
  
  // Otherwise, assume it's already base64
  return input;
}

// Helper function to estimate decoded size
function estimateDecodedSize(base64String) {
  if (!base64String) return 0;
  
  // Calculate padding characters
  const padding = (base64String.match(/=/g) || []).length;
  
  // Estimated decoded size in bytes
  const decodedSizeBytes = Math.ceil((base64String.length * 3) / 4) - padding;
  
  // Convert to MB
  return decodedSizeBytes / (1024 * 1024);
}

// @desc Upload print-ready image + thumbnail to Cloudinary
// @route POST /api/upload/printfile
// @access Private
const uploadPrintFile = async (req, res) => {
  try {
    const { imageData, dataUrl, productSlug, side, designName } = req.body;

    // Accept either imageData (raw base64) or dataUrl (full data: URI)
    let finalImageData;
    if (imageData) {
      finalImageData = extractBase64(imageData);
    } else if (dataUrl) {
      finalImageData = extractBase64(dataUrl);
    } else {
      return res.status(400).json({ message: 'No image data provided.' });
    }

    if (!finalImageData) {
      return res.status(400).json({ message: 'Invalid image data format.' });
    }

    // Preflight decoded size estimation
    const estimatedMB = estimateDecodedSize(finalImageData);
    if (estimatedMB > MAX_PRINTFILE_DECODED_MB) {
      const recommendation = estimatedMB > MAX_PRINTFILE_DECODED_MB * 2 
        ? 'Consider reducing image resolution or using a more compressed format'
        : 'Try reducing image quality or resolution slightly';
        
      return sendError(
        res,
        'UPLOAD_TOO_LARGE',
        413,
        `Print file exceeds max of ${MAX_PRINTFILE_DECODED_MB} MB`,
        {
          maxMB: MAX_PRINTFILE_DECODED_MB,
          estimatedMB: Math.round(estimatedMB * 10) / 10,
          recommendation
        }
      );
    }

    // Prepare imageData for Cloudinary (ensure it has data URL format)
    const cloudinaryImageData = finalImageData.startsWith('data:') 
      ? finalImageData 
      : `data:image/png;base64,${finalImageData}`;

    // 1. Upload full-size print file
    const uploadResult = await cloudinary.v2.uploader.upload(cloudinaryImageData, {
      folder: `tees_from_the_past/print_files/${productSlug || 'general'}`,
      public_id: `${designName || 'print'}-${side || 'front'}-${Date.now()}`,
      resource_type: 'image',
      format: 'png', // Keep transparency
      quality: 'auto:best',
      overwrite: false,
      tags: [
        'printify-dtg',
        'custom-design',
        `user-${req.user?._id || 'anon'}`,
        productSlug || '',
        side || ''
      ],
    });

    // 2. Generate thumbnail URL (Cloudinary transformation)
    const thumbUrl = cloudinary.v2.url(uploadResult.public_id, {
      width: 400,
      height: 400,
      crop: 'fit',
      format: 'png',
      secure: true
    });

    // 3. Send both URLs to frontend
    res.status(200).json({
      message: 'Image uploaded successfully!',
      publicUrl: uploadResult.secure_url, // Full-size for Printify
      thumbUrl, // Lightweight for UI
      publicId: uploadResult.public_id
    });

  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    res.status(500).json({ message: 'Failed to upload print file', error: error.message });
  }
};

// TODO: Future optimization - add /api/upload/printfile-stream endpoint for multipart/streaming uploads

export { uploadPrintFile };
