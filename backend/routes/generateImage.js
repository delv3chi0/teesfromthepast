// backend/routes/generateImage.js
import express from 'express';
import axios from 'axios';
import 'dotenv/config'; // To load STABILITY_API_KEY from .env
import { protect } from '../middleware/authMiddleware.js'; // To make sure only logged-in users can generate

const router = express.Router();

const STABILITY_API_ENGINE_ID = 'stable-diffusion-xl-1024-v1-0'; // Example for SDXL 1.0
const STABILITY_API_HOST = 'https://api.stability.ai';
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;

if (!STABILITY_API_KEY) {
    console.error("Stability AI API key is missing. Please check your .env file.");
}

// Let's make a route like POST /api/designs/create
router.post('/designs/create', protect, async (req, res) => {
    const { prompt } = req.body; // The user's idea for the picture

    if (!STABILITY_API_KEY) {
        return res.status(500).json({ message: "Image generation service is not configured." });
    }
    if (!prompt) {
        return res.status(400).json({ message: "A prompt is required to generate an image." });
    }

    console.log(`[Design Engine] Received prompt: "${prompt}"`);

    try {
        const response = await axios.post(
            `${STABILITY_API_HOST}/v1/generation/${STABILITY_API_ENGINE_ID}/text-to-image`,
            {
                text_prompts: [{ text: prompt }],
                cfg_scale: 7,       // How strictly the diffusion process adheres to the prompt text
                height: 1024,       // Output height in pixels
                width: 1024,        // Output width in pixels
                steps: 30,          // Number of diffusion steps
                samples: 1,         // Number of images to generate
                // style_preset: "enhance", // Example style preset, check Stability AI docs for more
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${STABILITY_API_KEY}`
                }
            }
        );

        // The image data is usually in response.data.artifacts[0].base64
        const imageArtifact = response.data.artifacts[0];
        if (imageArtifact && imageArtifact.base64) {
            console.log("[Design Engine] Image generated successfully.");
            // For now, we send back the base64 image data directly.
            // Later, we might save this to a file or cloud storage and send a URL.
            res.json({
                message: "Image generated successfully!",
                // Sending as a data URL for easy display in browser <img src="data:image/png;base64,..." />
                imageDataUrl: `data:image/png;base64,${imageArtifact.base64}`
            });
        } else {
            throw new Error("No image data found in Stability AI response.");
        }

    } catch (error) {
        console.error("[Design Engine] Error calling Stability AI:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Failed to generate image.", error: error.response ? error.response.data : error.message });
    }
});

export default router;
