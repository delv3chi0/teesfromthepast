// backend/controllers/storefrontProductController.js

import fetch from 'node-fetch';
const { AbortController } = fetch;

// Helper function to transform Printful product data
const transformPrintfulProduct = (printfulProduct) => {
    if (!printfulProduct || typeof printfulProduct !== 'object') {
        console.warn(`[Printful Transform Warning] Invalid or non-object input received. Skipping transformation.`);
        return { _id: `error-${Date.now()}`, name: 'Invalid Product', basePrice: 0, variants: [], description: '', slug: '' };
    }

    const productInfo = printfulProduct.sync_product;
    const variantList = printfulProduct.sync_variants;

    if (!productInfo || !Array.isArray(variantList)) {
        console.warn(`[Printful Transform Warning] Product is missing critical data. Skipping transformation.`);
        return { _id: `error-${Date.now()}`, name: 'Invalid Product', basePrice: 0, variants: [], description: '', slug: '' };
    }

    const firstVariant = variantList?.[0];
    const basePrice = firstVariant ? (parseFloat(firstVariant.retail_price) || 0) : 0;

    const transformedVariants = variantList.map(syncVariant => {
        const colorOption = syncVariant.options?.find(opt => opt.id === 'color');
        const sizeOption = syncVariant.options?.find(opt => opt.id === 'size');
        const frontMockup = syncVariant.files?.find(file => file.type === 'mockup' && file.position === 'front');
        const backMockup = syncVariant.files?.find(file => file.type === 'mockup' && file.position === 'back');
        const sleeveMockup = syncVariant.files?.find(file => file.type === 'mockup' && file.position === 'back');

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

    // ADDED LOGGING HERE TO VALIDATE THE KEY
    if (!PRINTFUL_API_KEY) {
        console.error("[Printful API] Key not found. Please check your .env file and Render environment variables.");
        return res.status(500).json({ error: 'Server configuration error: Printful API key missing.' });
    }
    console.log("[Printful API] API key loaded successfully.");

    // Set a timeout for the API calls
    const timeout = 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        console.log('[Printful API] Attempting to fetch list of products from Printful...');
        const listResponse = await fetch('https://api.printful.com/store/products', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        });
        console.log(`[Printful API] List response status: ${listResponse.status}`);
        
        if (!listResponse.ok) {
            const errorData = await listResponse.json();
            console.error("[Printful API Error] (getShopData - List Response Not OK):", errorData);
            return res.status(listResponse.status).json({ error: 'Failed to fetch product list from Printful.' });
        }

        const listData = await listResponse.json();
        const printfulProductList = listData.result || [];
        
        const detailedProductPromises = printfulProductList.map(async (product) => {
            const detailResponse = await fetch(`https://api.printful.com/store/products/${product.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            });
            
            if (!detailResponse.ok) {
                const errorData = await detailResponse.json();
                console.error(`[Printful API Error] (getShopData - Detail Response Not OK for ${product.id}):`, errorData);
                return null;
            }
            
            const detailData = await detailResponse.json();
            return detailData.result;
        });

        const detailedPrintfulProducts = (await Promise.all(detailedProductPromises)).filter(p => p !== null);
        const transformedProducts = detailedPrintfulProducts.map(transformPrintfulProduct).filter(p => p.variants.length > 0);
        res.json(transformedProducts);
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[Backend Error] Printful API request timed out:', error);
            res.status(500).json({ error: 'Printful API request timed out.' });
        } else {
            console.error('[Backend Error] Server error fetching Printful products:', error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getAllActiveProducts = async (req, res) => {
    console.log('[AllActiveProducts Controller] Request received for /api/storefront/products');

    const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

    if (!PRINTFUL_API_KEY) {
        console.error("[Printful API] Key not found. Please check your .env file and Render environment variables.");
        return res.status(500).json({ error: 'Server configuration error: Printful API key missing.' });
    }
    console.log("[Printful API] API key loaded successfully.");

    const timeout = 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        console.log('[Printful API] Attempting to fetch list of products from Printful...');
        const listResponse = await fetch('https://api.printful.com/store/products', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        });
        console.log(`[Printful API] List response status: ${listResponse.status}`);
        
        if (!listResponse.ok) {
            const errorData = await listResponse.json();
            console.error("[Printful API Error] (getAllActiveProducts - List Response Not OK):", errorData);
            return res.status(listResponse.status).json({ error: 'Failed to fetch product list from Printful.' });
        }

        const listData = await listResponse.json();
        const printfulProductList = listData.result || [];

        const detailedProductPromises = printfulProductList.map(async (product) => {
            const detailResponse = await fetch(`https://api.printful.com/store/products/${product.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            });
            
            if (!detailResponse.ok) {
                const errorData = await detailResponse.json();
                console.error(`[Printful API Error] (getAllActiveProducts - Detail Response Not OK for ${product.id}):`, errorData);
                return null;
            }
            
            const detailData = await detailResponse.json();
            return detailData.result;
        });

        const detailedPrintfulProducts = (await Promise.all(detailedProductPromises)).filter(p => p !== null);
        const transformedProducts = detailedPrintfulProducts.map(transformPrintfulProduct).filter(p => p.variants.length > 0);
        res.json(transformedProducts);
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[Backend Error] Printful API request timed out:', error);
            res.status(500).json({ error: 'Printful API request timed out.' });
        } else {
            console.error('[Backend Error] Server error fetching all active Printful products:', error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    } finally {
        clearTimeout(timeoutId);
    }
};

export const getProductBySlug = async (req, res) => {
    console.warn("getProductBySlug: This function is a placeholder and needs implementation to work with Printful data.");
    res.status(501).json({ message: "Not Implemented: getProductBySlug for Printful integration." });
};
