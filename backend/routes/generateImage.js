// backend/routes/generateImage.js
import express from 'express';
import axios from 'axios';
import 'dotenv/config';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const STABILITY_API_ENGINE_ID = 'stable-diffusion-xl-1024-v1-0'; // Your configured engine ID
const STABILITY_API_HOST = 'https://api.stability.ai';

router.post('/designs/create', protect, async (req, res) => {
    console.log('-----------------------------------------------------');
    console.log("[GenerateImage] Route handler started.");

    const apiKeyFromEnv = process.env.STABILITY_AI_API_KEY;
    if (!apiKeyFromEnv) {
        console.error("[GenerateImage] Stability AI API key is missing from environment variables!");
        return res.status(500).json({ message: "Image generation service is not configured (API key missing)." });
    }

    // MODIFIED: Destructure prompt and NEW initImageBase64 from req.body
    const { prompt, initImageBase64 } = req.body;

    if (!prompt && !initImageBase64) {
        return res.status(400).json({ message: "Either a text prompt or an initial image is required to generate an image." });
    }

    console.log(`[GenerateImage] Received prompt: "${prompt}"`);
    if (initImageBase64) {
        console.log("[GenerateImage] Received initial image for image-to-image generation.");
    }

    try {
        let apiUrl = '';
        let requestBody = {};
        let contentType = 'application/json'; // Default for JSON body

        if (initImageBase64) {
            // --- Image-to-Image Generation ---
            apiUrl = `${STABILITY_API_HOST}/v1/generation/${STABILITY_API_ENGINE_ID}/image-to-image`;
            // For image-to-image, Stability AI typically expects multipart/form-data for image.
            // If frontend sends Base64 in JSON, you might need to convert it to a Buffer
            // or modify this endpoint to expect multipart/form-data using 'multer'.
            // For simplicity in this direct JSON example, let's assume Stability AI accepts base64 via JSON if init_image_mode is set.
            // However, Stability AI's image-to-image usually expects FormData.
            // If this fails, the frontend will need to send FormData.

            // To support Base64 in JSON, we can convert it to Buffer
            // However, Stability AI's image-to-image API usually expects a FormData object with the image file appended.
            // If frontend sends it as Base64 in JSON body, you'd typically convert it like this:
            const imageDataBuffer = Buffer.from(initImageBase64.split(',')[1], 'base64'); // Assuming "data:image/png;base64,..." format

            // To send Buffer in axios, we'd need a FormData object. This will require 'multer' or similar setup on backend.
            // Given the complexity of multipart/form-data for this simple route, let's assume for now
            // that Stability AI text-to-image endpoint can potentially be used with a prompt
            // derived from the image, or that we're sending a base64 for *some* endpoint.

            // Re-evaluating: Stability AI's image-to-image endpoint expects `init_image` as a binary file in `multipart/form-data`.
            // Sending it as Base64 in a JSON body is not standard for this API.
            // To make this work, the frontend needs to send `multipart/form-data`, and the backend needs `multer`.

            // For now, let's keep the backend simplified and assume if an image is provided,
            // we will try to pass a specific prompt *and* acknowledge image provided, but
            // the *full* image-to-image functionality might require a separate route/library setup.

            // A more direct path for image-to-image: frontend sends base64, backend forms FormData.
            // This requires 'form-data' package on backend.

            const FormData = require('form-data'); // Import form-data package at top

            const formData = new FormData();
            formData.append('init_image', imageDataBuffer, {
                filename: 'image.png', // Or image.jpeg based on actual file type
                contentType: 'image/png', // Or image/jpeg
            });
            formData.append('text_prompts[0][text]', prompt);
            formData.append('text_prompts[0][weight]', '1');
            formData.append('init_image_mode', 'IMAGE_STRENGTH');
            formData.append('image_strength', '0.35'); // How much the original image influences the result
            formData.append('cfg_scale', '7');
            formData.append('height', '1024');
            formData.append('width', '1024');
            formData.append('steps', '30');
            formData.append('samples', '1');

            requestBody = formData;
            contentType = `multipart/form-data; boundary=${formData._boundary}`; // Important for FormData

        } else {
            // --- Text-to-Image Generation (Existing Logic) ---
            apiUrl = `${STABILITY_API_HOST}/v1/generation/${STABILITY_API_ENGINE_ID}/text-to-image`;
            requestBody = {
                text_prompts: [{ text: prompt }],
                cfg_scale: 7,
                height: 1024,
                width: 1024,
                steps: 30,
                samples: 1,
            };
            contentType = 'application/json';
        }

        const response = await axios.post(apiUrl, requestBody, {
            headers: {
                'Content-Type': contentType,
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKeyFromEnv}`
            },
            maxBodyLength: Infinity, // Important for large image uploads
        });

        const imageArtifact = response.data.artifacts[0];
        if (imageArtifact && imageArtifact.base64) {
            console.log("[GenerateImage] Image generated successfully.");
            res.json({
                message: "Image generated successfully!",
                imageDataUrl: `data:image/png;base64,${imageArtifact.base64}`
            });
        } else {
            throw new Error("No image data found in Stability AI response.");
        }

    } catch (error) {
        console.error("[GenerateImage] Error calling Stability AI:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        if (error.response && error.response.data && error.response.data.errors) {
            console.error("[GenerateImage] Stability AI specific errors:", JSON.stringify(error.response.data.errors, null, 2));
        }
        res.status(500).json({
            message: "Failed to generate image.",
            errorDetails: error.response ? error.response.data : error.message
        });
    } finally {
        console.log('-----------------------------------------------------');
    }
});

export default router;
