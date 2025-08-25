import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to detect base64 encoded size
const getBase64DecodedSize = (base64String) => {
  // Strip data URL prefix if present
  const base64Data = base64String.replace(/^data:[^;]+;base64,/, '');
  // Calculate approximate size: (length * 3/4) - padding
  const padding = (base64Data.match(/=/g) || []).length;
  return Math.floor((base64Data.length * 3) / 4) - padding;
};

// @desc Upload print-ready image + thumbnail to Cloudinary
// @route POST /api/upload/printfile
// @access Private
const uploadPrintFile = async (req, res) => {
  try {
    const { imageData, dataUrl, productSlug, side, designName } = req.body;

    // Accept either imageData (preferred) or legacy dataUrl
    const uploadData = imageData || dataUrl;
    if (!uploadData) {
      return res.status(400).json({ message: 'No image data provided.' });
    }

    // Check approximate decoded size and respond with 413 if too large
    const decodedSizeBytes = getBase64DecodedSize(uploadData);
    const maxSizeBytes = 22 * 1024 * 1024; // 22MB limit
    if (decodedSizeBytes > maxSizeBytes) {
      const sizeMB = Math.round(decodedSizeBytes / (1024 * 1024) * 10) / 10;
      const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
      console.error('[Upload] File too large:', { sizeMB, maxMB, decodedSizeBytes });
      return res.status(413).json({ 
        message: `Image too large (${sizeMB}MB). Maximum size is ${maxMB}MB.`,
        maxMB 
      });
    }

    // 1. Upload full-size print file
    const uploadResult = await cloudinary.v2.uploader.upload(uploadData, {
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
    console.error('[Upload] Cloudinary Upload Error:', error);
    res.status(500).json({ message: 'Failed to upload print file', error: error.message });
  }
};

export { uploadPrintFile };
