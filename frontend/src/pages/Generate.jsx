// backend/controllers/designController.js
import 'dotenv/config';
import axios from 'axios';
import FormData from 'form-data';

const STABILITY_API_KEY = process.env.STABILITY_API_KEY || process.env.STABILITY_AI_API_KEY;
const STABILITY_BASE = 'https://api.stability.ai';

const T2I_ENGINE = process.env.STABILITY_API_ENGINE_ID || 'stable-diffusion-xl-1024-v1-0';
const T2I_W = parseInt(process.env.GEN_TARGET_WIDTH || '1024', 10);
const T2I_H = parseInt(process.env.GEN_TARGET_HEIGHT || '1024', 10);

function dataUrlToBuffer(dataUrl) {
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Buffer.from(b64, 'base64');
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export async function createDesign(req, res) {
  try {
    if (!STABILITY_API_KEY) {
      return res.status(500).json({ message: 'STABILITY_API_KEY missing' });
    }

    const { prompt, initImageBase64, imageStrength } = req.body || {};
    if (!prompt && !initImageBase64) {
      return res.status(400).json({ message: 'Either prompt or init image required' });
    }

    // ------------------ IMG2IMG (NO width/height allowed in v1) ------------------
    if (initImageBase64) {
      const form = new FormData();
      const imgBuf = dataUrlToBuffer(initImageBase64);
      form.append('init_image', imgBuf, { filename: 'init.png', contentType: 'image/png' });
      form.append('text_prompts[0][text]', String(prompt || ''));
      form.append('text_prompts[0][weight]', '1');

      // Stability v1 img2img accepts image_strength ∈ [0,1]; default ~0.35–0.5 feels good
      const strength = clamp(Number(imageStrength ?? 0.35), 0, 1);
      form.append('image_strength', String(strength));

      // You may tweak these:
      form.append('cfg_scale', '7');
      form.append('steps', '30');
      form.append('samples', '1');

      const { data } = await axios.post(
        `${STABILITY_BASE}/v1/generation/${T2I_ENGINE}/image-to-image`,
        form,
        {
          headers: { Authorization: `Bearer ${STABILITY_API_KEY}`, ...form.getHeaders() },
          maxBodyLength: Infinity,
        }
      );

      const b64 = data?.artifacts?.[0]?.base64;
      if (!b64) return res.status(502).json({ message: 'No image returned from Stability (img2img).' });
      return res.json({ imageDataUrl: `data:image/png;base64,${b64}` });
    }

    // ------------------ TEXT2IMG (width/height OK) ------------------
    const payload = {
      text_prompts: [{ text: String(prompt || '') }],
      cfg_scale: 7,
      height: T2I_H,
      width: T2I_W,
      steps: 30,
      samples: 1,
    };

    const { data } = await axios.post(
      `${STABILITY_BASE}/v1/generation/${T2I_ENGINE}/text-to-image`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${STABILITY_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        maxBodyLength: Infinity,
      }
    );

    const b64 = data?.artifacts?.[0]?.base64;
    if (!b64) return res.status(502).json({ message: 'No image returned from Stability (t2i).' });
    return res.json({ imageDataUrl: `data:image/png;base64,${b64}` });
  } catch (err) {
    const data = err.response?.data;
    return res.status(err.response?.status || 500).json({
      message: 'Failed to generate image.',
      error: data || { message: err.message },
    });
  }
}
