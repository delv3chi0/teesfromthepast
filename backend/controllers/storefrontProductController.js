// backend/controllers/storefrontProductController.js

import fetch from 'node-fetch';

// Helper function to transform Printful product data to your frontend's expected format
const transformPrintfulProduct = (printfulProduct) => {
    // Log the raw product to inspect its structure if needed
    // console.log("Raw Printful Product for transformation:", JSON.stringify(printfulProduct, null, 2));

    // CRITICAL FIX: Explicitly extract sync_product and sync_variants
    const productInfo = printfulProduct.sync_product;
    const variantList = printfulProduct.sync_variants;

    // Robust check for productInfo and variantList
    if (!productInfo || productInfo.id === undefined || productInfo.id === null || !Array.isArray(variantList)) {
        console.warn(`[Printful Transform Warning] Product is missing critical data (sync_product.id or sync_variants). Raw input: ${JSON.stringify(printfulProduct)}. Skipping transformation.`);
        return {
            _id: `error-${Date.now()}`, // Generate a unique ID for error products
            name: 'Invalid Product (Missing Data)',
            basePrice: 0,
            variants: [],
            description: 'This product could not be fully loaded due to missing or invalid data from Printful.',
            slug: 'invalid-product',
        };
    }

    const firstVariant = variantList?.[0]; // Use variantList here
    const basePrice = firstVariant ? parseFloat(firstVariant.retail_price) || 0 : 0;

    const transformedVariants = variantList.map(syncVariant => { // Use variantList here
        const colorOption = syncVariant.options?.find(opt => opt.id === 'color');
        const sizeOption = syncVariant.options?.find(opt => opt.id === 'size');

        const frontMockup = syncVariant.files?.find(file => file.type === 'mockup' && file.position === 'front');
        const backMockup = syncVariant.files?.find(file => file.type === 'mockup' && file.position === 'back');
        const sleeveMockup = syncVariant.files?.find(file => file.type === 'mockup' && file.position === 'sleeve');

        const dummyPrintAreas = [
            { placement: 'Full-front', widthInches: 12, heightInches: 16 },
            { placement: 'Full-back', widthInches: 12, heightInches: 16 },
            { placement: 'Sleeve', widthInches: 4, heightInches: 4 }
        ];

        return {
            sku: syncVariant.sku || syncVariant.id.toString(),
            colorName: colorOption ? colorOption.value : 'Default Color',
            priceModifier: (parseFloat(syncVariant.retail_price) || 0) - basePrice,
            imageSet: [
                {
                    url: syncVariant.thumbnail_url || frontMockup?.url || 'https://placehold.co/300x400/000000/FFFFFF?text=No+Image',
                    frontMockupUrl: frontMockup?.url || 'https://placehold.co/300x400/000000/FFFFFF?text=No+Front+Mockup',
                    backMockupUrl: backMockup?.url || 'https://placehold.co/300x400/000000/FFFFFF?text=No+Back+Mockup',
                    sleeveMockupUrl: sleeveMockup?.url || 'https://placehold.co/300x400/000000/FFFFFF?text=No+Sleeve+Mockup',
                }
            ],
            sizes: sizeOption ? [{ size: sizeOption.value, inStock: true }] : [],
            printAreas: dummyPrintAreas,
        };
    });

    const groupedVariants = {};
    transformedVariants.forEach(variant => {
        if (!groupedVariants[variant.colorName]) {
            groupedVariants[variant.colorName] = {
                colorName: variant.colorName,
                sku: variant.sku,
                priceModifier: variant.priceModifier,
                imageSet: variant.imageSet,
                sizes: [],
                printAreas: variant.printAreas,
                isDefaultDisplay: false
            };
        }
        variant.sizes.forEach(size => {
            if (!groupedVariants[variant.colorName].sizes.some(s => s.size === size.size)) {
                groupedVariants[variant.colorName].sizes.push(size);
            }
        });
    });

    const finalVariants = Object.values(groupedVariants);
    if (finalVariants.length > 0) {
        finalVariants[0].isDefaultDisplay = true;
    }

    return {
        _id: productInfo.id.toString(), // Access id from productInfo
        name: productInfo.name, // Access name from productInfo
        basePrice: basePrice,
        variants: finalVariants,
        description: productInfo.name, // Access name from productInfo
        slug: productInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, ''), // Access name from productInfo
    };
};

export const getShopData = async (req, res) => {
    console.log('[ShopData Controller] Request received for /api/storefront/shop-data');

    const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

    if (!PRINTFUL_API_KEY) {
        console.error("[Printful API] Key not found. Please check your .env file.");
        return res.status(500).json({ error: 'Server configuration error: Printful API key missing.' });
    }

    try {
        // Step 1: Get the list of products from Printful (high-level)
        const listResponse = await fetch('https://api.printful.com/store/products', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        if (!listResponse.ok) {
            const errorData = await listResponse.json();
            console.error("[Printful API Error] (getShopData - List):", errorData);
            return res.status(listResponse.status).json({ error: 'Failed to fetch product list from Printful.' });
        }

        const listData = await listResponse.json();
        const printfulProductList = listData.result || [];

        // console.log("Raw Printful data.result from /store/products (List):", JSON.stringify(printfulProductList, null, 2));

        // Step 2: For each product, fetch its detailed information including sync_variants
        const detailedProductPromises = printfulProductList.map(async (product) => {
            const detailResponse = await fetch(`https://api.printful.com/store/products/${product.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!detailResponse.ok) {
                const errorData = await detailResponse.json();
                console.error(`[Printful API Error] (getShopData - Detail for ${product.id}):`, errorData);
                return null; // Return null for failed fetches
            }

            const detailData = await detailResponse.json();
            // This result is { sync_product: {...}, sync_variants: [...] }
            return detailData.result;
        });

        const detailedPrintfulProducts = (await Promise.all(detailedProductPromises)).filter(p => p !== null);

        // console.log("Detailed Printful Products (after individual fetches):", JSON.stringify(detailedPrintfulProducts, null, 2));

        const transformedProducts = detailedPrintfulProducts
            .map(transformPrintfulProduct)
            .filter(product => product.variants.length > 0); // Filter out products that failed transformation or have no variants

        res.json(transformedProducts);

    } catch (error) {
        console.error('[Backend Error] Server error fetching Printful products for shop data:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

export const getAllActiveProducts = async (req, res) => {
    console.log('[AllActiveProducts Controller] Request received for /api/storefront/products');

    const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

    if (!PRINTFUL_API_KEY) {
        console.error("[Printful API] Key not found. Please check your .env file.");
        return res.status(500).json({ error: 'Server configuration error: Printful API key missing.' });
    }

    try {
        // Step 1: Get the list of products from Printful (high-level)
        const listResponse = await fetch('https://api.printful.com/store/products', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        if (!listResponse.ok) {
            const errorData = await listResponse.json();
            console.error("[Printful API Error] (getAllActiveProducts - List):", errorData);
            return res.status(listResponse.status).json({ error: 'Failed to fetch product list from Printful.' });
        }

        const listData = await listResponse.json();
        const printfulProductList = listData.result || [];

        // Step 2: For each product, fetch its detailed information including sync_variants
        const detailedProductPromises = printfulProductList.map(async (product) => {
            const detailResponse = await fetch(`https://api.printful.com/store/products/${product.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!detailResponse.ok) {
                const errorData = await detailResponse.json();
                console.error(`[Printful API Error] (getAllActiveProducts - Detail for ${product.id}):`, errorData);
                return null; // Return null for failed fetches
            }

            const detailData = await detailResponse.json();
            return detailData.result;
        });

        const detailedPrintfulProducts = (await Promise.all(detailedProductPromises)).filter(p => p !== null);

        const transformedProducts = detailedPrintfulProducts
            .map(transformPrintfulProduct)
            .filter(product => product.variants.length > 0);

        res.json(transformedProducts);

    } catch (error) {
        console.error('[Backend Error] Server error fetching all active Printful products:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

export const getProductBySlug = async (req, res) => {
    console.warn("getProductBySlug: This function is a placeholder and needs implementation to work with Printful data.");
    res.status(501).json({ message: "Not Implemented: getProductBySlug for Printful integration." });
};
