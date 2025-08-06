// backend/controllers/storefrontProductController.js

import fetch from 'node-fetch';
import { AbortController } from 'node-fetch'; // Import AbortController for timeouts

// Helper function to transform Printful product data to your frontend's expected format
const transformPrintfulProduct = (printfulProduct) => {
    if (!printfulProduct || typeof printfulProduct !== 'object') {
        console.warn(`[Printful Transform Warning] Invalid or non-object input received for transformation. Input: ${JSON.stringify(printfulProduct)}. Skipping transformation.`);
        return {
            _id: `error-${Date.now()}`,
            name: 'Invalid Product (Corrupted Data)',
            basePrice: 0,
            variants: [],
            description: 'This product could not be loaded due to corrupted data.',
            slug: 'corrupted-product',
        };
    }

    const productInfo = printfulProduct.sync_product;
    const variantList = printfulProduct.sync_variants;

    if (!productInfo || productInfo.id === undefined || productInfo.id === null || !Array.isArray(variantList)) {
        console.warn(`[Printful Transform Warning] Product is missing critical data (sync_product.id or sync_variants). Raw input: ${JSON.stringify(printfulProduct)}. Skipping transformation.`);
        return {
            _id: `error-${Date.now()}`,
            name: 'Invalid Product (Missing Data)',
            basePrice: 0,
            variants: [],
            description: 'This product could not be fully loaded due to missing or invalid data from Printful.',
            slug: 'invalid-product',
        };
    }

    const firstVariant = variantList?.[0];
    const basePrice = firstVariant ? (parseFloat(firstVariant.retail_price) || 0) : 0;

    const transformedVariants = variantList.map(syncVariant => {
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
        _id: productInfo.id.toString(),
        name: productInfo.name || 'Unknown Product',
        basePrice: basePrice,
        variants: finalVariants,
        description: productInfo.name || 'No description available.',
        slug: (productInfo.name || 'unknown-product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, ''),
    };
};

export const getShopData = async (req, res) => {
    console.log('[ShopData Controller] Request received for /api/storefront/shop-data');

    const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

    if (!PRINTFUL_API_KEY) {
        console.error("[Printful API] Key not found. Please check your .env file.");
        return res.status(500).json({ error: 'Server configuration error: Printful API key missing.' });
    }

    // Set a timeout for the API calls
    const timeout = 10000; // 10 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        let listResponse;
        try {
            listResponse = await fetch('https://api.printful.com/store/products', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal // Apply the timeout signal
            });
            console.log(`[Printful API] List response status: ${listResponse.status}`);
        } catch (fetchError) {
            console.error("[Printful API Error] (getShopData - List Fetch Failed):", fetchError);
            return res.status(500).json({ error: 'Network or API issue fetching product list from Printful.' });
        }


        if (!listResponse.ok) {
            const errorData = await listResponse.json();
            console.error("[Printful API Error] (getShopData - List Response Not OK):", errorData);
            return res.status(listResponse.status).json({ error: 'Failed to fetch product list from Printful.' });
        }

        const listData = await listResponse.json();
        const printfulProductList = listData.result || [];

        // console.log("Raw Printful data.result from /store/products (List):", JSON.stringify(printfulProductList, null, 2));

        const detailedProductPromises = printfulProductList.map(async (product) => {
            let detailResponse;
            try {
                detailResponse = await fetch(`https://api.printful.com/store/products/${product.id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    signal: controller.signal // Apply the timeout signal
                });
                console.log(`[Printful API] Detail response status for ${product.id}: ${detailResponse.status}`);
            } catch (fetchError) {
                console.error(`[Printful API Error] (getShopData - Detail Fetch Failed for ${product.id}):`, fetchError);
                return null;
            }


            if (!detailResponse.ok) {
                const errorData = await detailResponse.json();
                console.error(`[Printful API Error] (getShopData - Detail Response Not OK for ${product.id}):`, errorData);
                return null;
            }

            const detailData = await detailResponse.json();
            return detailData.result;
        });

        const detailedPrintfulProducts = (await Promise.all(detailedProductPromises)).filter(p => p !== null);

        // console.log("Detailed Printful Products (after individual fetches):", JSON.stringify(detailedPrintfulProducts, null, 2));

        const transformedProducts = detailedPrintfulProducts
            .map(transformPrintfulProduct)
            .filter(product => product.variants.length > 0);

        res.json(transformedProducts);

    } catch (error) {
        console.error('[Backend Error] Server error fetching Printful products for shop data:', error);
        res.status(500).json({ error: 'Internal server error.' });
    } finally {
        clearTimeout(timeoutId); // Clear the timeout if the request completes
    }
};

export const getAllActiveProducts = async (req, res) => {
    console.log('[AllActiveProducts Controller] Request received for /api/storefront/products');

    const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

    if (!PRINTFUL_API_KEY) {
        console.error("[Printful API] Key not found. Please check your .env file.");
        return res.status(500).json({ error: 'Server configuration error: Printful API key missing.' });
    }

    const timeout = 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        let listResponse;
        try {
            listResponse = await fetch('https://api.printful.com/store/products', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            });
            console.log(`[Printful API] List response status: ${listResponse.status}`);
        } catch (fetchError) {
            console.error("[Printful API Error] (getAllActiveProducts - List Fetch Failed):", fetchError);
            return res.status(500).json({ error: 'Network or API issue fetching product list from Printful.' });
        }


        if (!listResponse.ok) {
            const errorData = await listResponse.json();
            console.error("[Printful API Error] (getAllActiveProducts - List Response Not OK):", errorData);
            return res.status(listResponse.status).json({ error: 'Failed to fetch product list from Printful.' });
        }

        const listData = await listResponse.json();
        const printfulProductList = listData.result || [];

        const detailedProductPromises = printfulProductList.map(async (product) => {
            let detailResponse;
            try {
                detailResponse = await fetch(`https://api.printful.com/store/products/${product.id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    signal: controller.signal
                });
                console.log(`[Printful API] Detail response status for ${product.id}: ${detailResponse.status}`);
            } catch (fetchError) {
                console.error(`[Printful API Error] (getAllActiveProducts - Detail Fetch Failed for ${product.id}):`, fetchError);
                return null;
            }


            if (!detailResponse.ok) {
                const errorData = await detailResponse.json();
                console.error(`[Printful API Error] (getAllActiveProducts - Detail Response Not OK for ${product.id}):`, errorData);
                return null;
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
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getProductBySlug = async (req, res) => {
    console.warn("getProductBySlug: This function is a placeholder and needs implementation to work with Printful data.");
    res.status(501).json({ message: "Not Implemented: getProductBySlug for Printful integration." });
};
