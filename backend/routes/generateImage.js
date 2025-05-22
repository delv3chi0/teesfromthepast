import express from 'express';
import axios from 'axios';
const router = express.Router();

router.post('/', async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: "stability-ai/sdxl",
        input: { prompt }
      },
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('❌ Replicate API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Image generation failed' });
  }
});

module.exports = router;
