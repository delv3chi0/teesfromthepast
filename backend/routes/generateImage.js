// backend/routes/generateImage.js
import express from 'express';
import axios from 'axios';
import 'dotenv/config'; 
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const STABILITY_API_ENGINE_ID = 'stable-diffusion-xl-1024-v1-0'; 
const STABILITY_API_HOST = 'https://api.stability.ai';

router.post('/designs/create', protect, async (req, res) => {
    // --- Start Diagnostic Logs ---
    console.log("[Diag V2 - /designs/create] Route handler started.");
    const apiKeyFromEnv = process.env.STABILITY_AI_API_KEY;
    console.log("[Diag V2 - /designs/create] process.env.STABILITY_AI_API_KEY:", apiKeyFromEnv);

    if (apiKeyFromEnv && apiKeyFromEnv.length > 10) { // Basic check if it looks like a key
        console.log("[Diag V2 - /designs/create] API Key seems present from env var.");
    } else {
        console.error("[Diag V2 - /designs/create] API Key is MISSING or too short from env var!");
    }
    // --- End Diagnostic Logs ---

    const { prompt } = req.body;

    if (!apiKeyFromEnv) { // Use the key read directly from process.env
        console.error("[Error Check V2] Stability AI API key is missing inside the route handler!");
        return res.status(500).json({ message: "Image generation service is not configured (API key missing at runtime)." });
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
                cfg_scale: 7,
                height: 1024,
                width: 1024,
                steps: 30,
                samples: 1,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKeyFromEnv}` // Use the key read directly from process.env
                }
            }
        );

        const imageArtifact = response.data.artifacts[0];
        if (imageArtifact && imageArtifact.base64) {
            console.log("[Design Engine] Image generated successfully.");
            res.json({
                message: "Image generated successfully!",
                imageDataUrl: `data:image/png;base64,${imageArtifact.base64}`
            });
        } else {
            throw new Error("No image data found in Stability AI response.");
        }

    } catch (error) {
        console.error("[Design Engine] Error calling Stability AI:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        // Log more details if available from Stability AI error
        if (error.response && error.response.data && error.response.data.errors) {
             console.error("[Design Engine] Stability AI specific errors:", JSON.stringify(error.response.data.errors, null, 2));
        }
        res.status(500).json({ 
            message: "Failed to generate image.", 
            errorDetails: error.response ? error.response.data : error.message 
        });
    }
});

export default router;
