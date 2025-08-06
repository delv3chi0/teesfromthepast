// This is a conceptual backend file (e.g., in Node.js)

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // or use another HTTP client

// It is crucial to store your API token in an environment variable, not hardcoded.
const PRINTFUL_API_KEY = "UbgirJGZ8kt35ba8RTBkRe7c7JzFYEUD9LQSz6lz";

router.get('/storefront/shop-data', async (req, res) => {
  try {
    const response = await fetch('https://api.printful.com/store/products', {
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Printful API Error:", errorData);
      return res.status(response.status).json({ error: 'Failed to fetch products from Printful.' });
    }

    const data = await response.json();
    
    // Process the data as needed before sending it to the frontend
    // For example, you might want to extract specific fields or format the data differently.
    const products = data.result;

    res.json(products);
  } catch (error) {
    console.error('Server error fetching Printful products:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
