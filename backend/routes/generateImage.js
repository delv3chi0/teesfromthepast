// backend/routes/generateImage.js
import express from 'express';
import 'dotenv/config'; // Ensure environment variables are loaded
import fetch from 'node-fetch'; // Import node-fetch for API calls

const router = express.Router();

router.post('/generateImage', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required.' });
    }

    try {
        // Stability AI API endpoint (replace with specific model if needed)
        const STABILITY_API_URL = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';

        const response = await fetch(STABILITY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${process.env.STABILITY_AI_API_KEY}` // Use your env var
            },
            body: JSON.stringify({
                text_prompts: [{ text: prompt }],
                cfg_scale: 7,       // Controls how much the image adheres to the prompt (higher = more aligned)
                height: 1024,
                width: 1024,
                samples: 1,         // Number of images to generate (keep at 1 for now)
                steps: 30,          // Number of denoising steps (higher = more detailed, slower)
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Stability AI API error:', errorData);
            // Return a more descriptive error if possible
            return res.status(response.status).json({
                message: 'Error generating image from Stability AI',
                details: errorData.message || 'Unknown error from Stability AI'
            });
        }

        const data = await response.json();

        if (data.artifacts && data.artifacts.length > 0) {
            // Stability AI returns base64 encoded images
            const imageBase64 = data.artifacts[0].base64;
            // Prepend data URI header for direct use in <img> tag
            const imageUrl = `data:image/png;base64,${imageBase64}`;
            return res.json({ imageUrl: imageUrl });
        } else {
            return res.status(500).json({ message: 'No image artifacts received from Stability AI.' });
        }

    } catch (error) {
        console.error('Server error during image generation:', error);
        res.status(500).json({ message: 'Internal server error during image generation.' });
    }
});

export default router;
