import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// @desc    Upload print-ready image to Cloudinary
// @route   POST /api/upload-print-file
// @access  Private (requires user to be logged in)
const uploadPrintFile = async (req, res) => {
    try {
        const { imageData, designName } = req.body;

        if (!imageData) {
            return res.status(400).json({ message: 'No image data provided.' });
        }

        // Upload the image to Cloudinary
        // `imageData` should be a Base64 string (e.g., "data:image/png;base64,iVBORw0KGgo...")
        const uploadResult = await cloudinary.v2.uploader.upload(imageData, {
            folder: 'tees_from_the_past/print_files', // Optional: organize uploads in a specific folder
            // You can add more options here like tags, quality settings for optimization
            // public_id: `print-${Date.now()}-${req.user._id}`, // Optional: custom public ID
            resource_type: 'image', // Explicitly specify image
            format: 'png', // Ensure it's stored as PNG for transparency
            quality: 'auto:best', // Cloudinary optimizes quality
            tags: ['printful-dtg', 'custom-design', `user-${req.user._id}`], // Useful for organization/tracking
            overwrite: false, // Don't overwrite if public_id is generated uniquely
            // Optional: If you want to force specific dimensions (e.g., for validation)
            // width: 4500, height: 5400, crop: 'limit'
        });

        res.status(200).json({
            message: 'Image uploaded successfully!',
            publicUrl: uploadResult.secure_url, // Use secure_url for HTTPS
            assetId: uploadResult.asset_id,
            publicId: uploadResult.public_id,
        });

    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        res.status(500).json({ message: 'Failed to upload print file', error: error.message });
    }
};

export { uploadPrintFile };
