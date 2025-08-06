// backend/controllers/storefrontProductController.js

import fetch from 'node-fetch'; // Make sure you have installed node-fetch: npm install node-fetch
// You can remove `import asyncHandler from 'express-async-handler';` and `import Product from '../models/Product.js';`
// and `import mongoose from 'mongoose';` as they are no longer directly used in this controller.

// Helper function to transform Printful product data to your frontend's expected format
const transformPrintfulProduct = (printfulProduct) => {
    // Printful's `/store/products` gives 'sync_products' and 'sync_variants'.
    // We need to map these to your frontend's `_id`, `name`, `basePrice`, `variants` structure.

    // A simple approach: use the first variant's retail price as basePrice for now.
    // In a real scenario, you might have a basePrice defined in your own DB.
    const firstVariant = printfulProduct.sync_variants?.[0];
    const basePrice = firstVariant ? parseFloat(firstVariant.retail_price) : 0;

    const transformedVariants = printfulProduct.sync_variants.map(syncVariant => {
        // Extract color and size from options
        const colorOption = syncVariant.options?.find(opt => opt.id === 'color');
        const sizeOption = syncVariant.options?.find(opt => opt.id === 'size');

        // Extract mockup URLs from files array
        // Printful's /store/products provides `thumbnail_url` which is often a good default.
        // For specific mockup positions (front, back, sleeve), you might need to iterate `syncVariant.files`.
        // The `files` array on `syncVariant` might not always contain specific position mockups directly from `/store/products`.
        // More detailed mockup URLs are typically available via the `GET /products/{id}/mockup-templates` or `GET /products/{id}/images` endpoints.
        // For simplicity, we'll use `thumbnail_url` as a primary image and assume generic mockups if not found.
        const frontMockup = syncVariant.files?.find(file => file.type === 'mockup' && file.position === 'front');
        const backMockup = syncVariant.files?.find(file => file.type === 'mockup' && file.position === 'back');
        const sleeveMockup = syncVariant.files?.find(file => file.type === 'mockup' && file.position === 'sleeve');


        // Note: Printful's /store/products doesn't directly give print area dimensions or inStock status per size.
        // You would typically get this from Printful's catalog API (GET /products/{id}) or your own database.
        // For now, we'll provide dummy values or derive from available data.
        const dummyPrintAreas = [
            { placement: 'Full-front', widthInches: 12, heightInches: 16 },
            { placement: 'Full-back', widthInches: 12, heightInches: 16 },
            { placement: 'Sleeve', widthInches: 4, heightInches: 4 }
        ];

        return {
            // Using Printful's sync_variant ID as SKU for now, or you can use syncVariant.sku
            sku: syncVariant.sku || syncVariant.id.toString(),
            colorName: colorOption ? colorOption.value : 'Default Color',
            priceModifier: parseFloat(syncVariant.retail_price) - basePrice, // Calculate modifier relative to basePrice
            imageSet: [
                {
                    url: syncVariant.thumbnail_url || frontMockup?.url || '', // Main image, fallback to front mockup
                    frontMockupUrl: frontMockup?.url || '',
                    backMockupUrl: backMockup?.url || '',
                    sleeveMockupUrl: sleeveMockup?.url || '',
                }
            ],
            // For simplicity, assuming all available sizes for this color variant are in stock.
            // In a real app, you'd check Printful's stock API or your own inventory.
            sizes: sizeOption ? [{ size: sizeOption.value, inStock: true }] : [],
            printAreas: dummyPrintAreas, // Placeholder, actual print areas need to be fetched from catalog API
        };
    });

    // Group variants by color to match your frontend's `uniqueColorVariants` logic
    const groupedVariants = {};
    transformedVariants.forEach(variant => {
        if (!groupedVariants[variant.colorName]) {
            groupedVariants[variant.colorName] = {
                colorName: variant.colorName,
                sku: variant.sku, // Take one SKU for the color group
                priceModifier: variant.priceModifier,
                imageSet: variant.imageSet,
                sizes: [],
                printAreas: variant.printAreas,
                isDefaultDisplay: false // You might set this based on your own logic
            };
        }
        // Add individual sizes to the grouped variant
        variant.sizes.forEach(size => {
            if (!groupedVariants[variant.colorName].sizes.some(s => s.size === size.size)) {
                groupedVariants[variant.colorName].sizes.push(size);
            }
        });
    });

    const finalVariants = Object.values(groupedVariants);
    if (finalVariants.length > 0) {
        finalVariants[0].isDefaultDisplay = true; // Set first color as default for display
    }

    return {
        _id: printfulProduct.id.toString(), // Use Printful's sync product ID as your _id
        name: printfulProduct.name,
        basePrice: basePrice,
        variants: finalVariants,
        description: printfulProduct.name, // Using name as description for now, adjust as needed
        slug: printfulProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, ''), // Generate a simple slug
        // Add other product-level details if available from Printful API or your DB
    };
};

/**
 * Fetches data for the main shop page from Printful.
 * Transforms Printful's sync products into a flat list suitable for ProductCard.
 */
export const getShopData = async (req, res) => {
    const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

    if (!PRINTFUL_API_KEY) {
        console.error("Printful API key not found. Please check your .env file.");
        return res.status(500).json({ error: 'Server configuration error: Printful API key missing.' });
    }

    try {
        const response = await fetch('https://api.printful.com/store/products', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Printful API Error (getShopData):", errorData);
            return res.status(response.status).json({ error: 'Failed to fetch products from Printful.' });
        }

        const data = await response.json();
        const printfulProducts = data.result || [];

        // Transform Printful products for the ShopPage's ProductCard
        const transformedProducts = printfulProducts.map(product => {
            const transformed = transformPrintfulProduct(product);
            // For ProductCard, we might only need a simplified view
            const mainVariant = transformed.variants?.[0];
            return {
                _id: transformed._id,
                name: transformed.name,
                slug: transformed.slug, // Include slug for linking
                description: transformed.description, // Include description
                unitPrice: transformed.basePrice, // ProductCard uses unitPrice
                // Assuming ProductCard just needs a single image URL
                productImage: mainVariant?.imageSet?.[0]?.url || 'https://placehold.co/300x400/000000/FFFFFF?text=No+Image',
                // Add other fields ProductCard expects if any
            };
        });

        res.json(transformedProducts);

    } catch (error) {
        console.error('Server error fetching Printful products for shop data:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Fetches all active products with full variant details for ProductStudio.jsx.
 * This function also calls the Printful API and transforms the data.
 */
export const getAllActiveProducts = async (req, res) => {
    const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

    if (!PRINTFUL_API_KEY) {
        console.error("Printful API key not found. Please check your .env file.");
        return res.status(500).json({ error: 'Server configuration error: Printful API key missing.' });
    }

    try {
        const response = await fetch('https://api.printful.com/store/products', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Printful API Error (getAllActiveProducts):", errorData);
            return res.status(response.status).json({ error: 'Failed to fetch products from Printful.' });
        }

        const data = await response.json();
        const printfulProducts = data.result || [];

        // Transform Printful products to the detailed structure expected by ProductStudio
        const transformedProducts = printfulProducts.map(transformPrintfulProduct);

        res.json(transformedProducts);

    } catch (error) {
        console.error('Server error fetching all active Printful products:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Placeholder for getProductBySlug.
 * This would typically fetch a single product by a friendly slug,
 * likely from your own database that maps slugs to Printful IDs or stores full product data.
 * Printful API doesn't directly support fetching by a custom 'slug'.
 */
export const getProductBySlug = async (req, res) => {
    // To implement this fully with Printful, you would likely:
    // 1. Fetch all products from Printful (using the same /store/products endpoint).
    // 2. Filter the `transformedProducts` array by the `req.params.slug`.
    // This is less efficient for single product lookups if you have many products.
    // A better approach for a production app would be to:
    //    a) Store a mapping of your slugs to Printful product IDs in your own database.
    //    b) Fetch the product by ID from Printful's catalog API (GET /products/{id}) if more details are needed,
    //       or retrieve the full product data from your own database if pre-cached.

    // For now, it remains a placeholder as direct slug lookup isn't a simple Printful API feature.
    console.warn("getProductBySlug: This function is a placeholder and needs implementation to work with Printful data.");
    res.status(501).json({ message: "Not Implemented: getProductBySlug for Printful integration." });
};
