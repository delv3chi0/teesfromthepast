// backend/controllers/printfulController.js
import axios from 'axios';

const PRINTFUL_API = 'https://api.printful.com';

export async function createPrintfulOrder(req, res) {
  try {
    const {
      recipient,               // { name, address1, city, state_code, country_code, zip, email, phone }
      items                    // [{ variant_id, quantity, placement, file_url, preview_url }]
    } = req.body;

    if (!recipient || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'recipient and items are required' });
    }

    // Map items to Printful format
    const pfItems = items.map(it => ({
      variant_id: it.variant_id,          // Printful VARIANT ID (NOT your slug)
      quantity: it.quantity || 1,
      files: [
        {
          type: it.placement || 'front',  // 'front' | 'back' | 'sleeve_right' | 'sleeve_left' etc.
          url: it.file_url                // <-- your Cloudinary secure_url
        }
      ],
      // Optional: extra mockup for order preview (not printed)
      options: it.preview_url ? [{ id: 'mockup', value: it.preview_url }] : []
    }));

    const payload = {
      recipient,
      items: pfItems,
      // Optional: do not immediately charge/fulfill; create a draft:
      // confirm: false
    };

    const resp = await axios.post(`${PRINTFUL_API}/orders`, payload, {
      headers: {
        Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 25000
    });

    return res.json(resp.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { message: err.message };
    return res.status(status).json({ message: 'Printful order error', error: data });
  }
}
