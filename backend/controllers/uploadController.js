import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// @desc Upload print-ready image + thumbnail to Cloudinary
// @route POST /api/upload/printfile
// @access Private
const uploadPrintFile = async (req, res) => {
  try {
    const { imageData, productSlug, side, designName } = req.body;

    if (!imageData) {
      return res.status(400).json({ message: 'No image data provided.' });
    }

    // 1. Upload full-size print file
    const uploadResult = await cloudinary.v2.uploader.upload(imageData, {
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

export { uploadPrintFile };
