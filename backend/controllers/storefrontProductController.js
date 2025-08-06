// backend/controllers/storefrontProductController.js

import fetch from 'node-fetch';

// Helper function to transform Printful product data to your frontend's expected format
const transformPrintfulProduct = (printfulProduct) => {
    // Log the raw product to inspect its structure if needed
    // console.log("Raw Printful Product for transformation:", JSON.stringify(printfulProduct, null, 2));

    // Ensure sync_variants exists and is an array before proceeding
    if (!printfulProduct || !Array.isArray(printfulProduct.sync_variants)) {
        console.warn(`[Printful Transform Warning] Product ${printfulProduct?.id || 'N/A'} is missing or has invalid 'sync_variants'. Skipping transformation.`);
        // Return a minimal, valid product structure to prevent crashes
        return {
            _id: printfulProduct?.id?.toString() || `error-${Date.now()}`,
            name: printfulProduct?.name || 'Invalid Product',
            basePrice: 0,
            variants: [],
            description: 'This product could not be fully loaded due to missing variant data.',
            slug: 'invalid-product',
        };
    }

    const firstVariant = printfulProduct.sync_variants?.[0];
    // Ensure basePrice is a number, default to 0 if not available
    const basePrice = firstVariant ? parseFloat(firstVariant.retail_price) || 0 : 0;

    const transformedVariants = printfulProduct.sync_variants.map(syncVariant => {
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
        _id: printfulProduct.id.toString(),
        name: printfulProduct.name,
        basePrice: basePrice,
        variants: finalVariants,
        description: printfulProduct.name,
        slug: printfulProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, ''),
    };
};

export const getShopData = async (req, res) => {
    const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

    if (!PRINTFUL_API_KEY) {
        console.error("[Printful API] Key not found. Please check your .env file.");
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
            console.error("[Printful API Error] (getShopData):", errorData);
            return res.status(response.status).json({ error: 'Failed to fetch products from Printful.' });
        }

        const data = await response.json();
        console.log("Raw Printful data.result from /store/products:", JSON.stringify(data.result, null, 2)); // Log raw data

        const printfulProducts = data.result || [];

        const transformedProducts = printfulProducts
            .map(transformPrintfulProduct)
            .filter(product => product.variants.length > 0); // Filter out products that failed transformation or have no variants

        res.json(transformedProducts);

    } catch (error) {
        console.error('[Backend Error] Server error fetching Printful products for shop data:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

export const getAllActiveProducts = async (req, res) => {
    const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

    if (!PRINTFUL_API_KEY) {
        console.error("[Printful API] Key not found. Please check your .env file.");
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
            console.error("[Printful API Error] (getAllActiveProducts):", errorData);
            return res.status(response.status).json({ error: 'Failed to fetch products from Printful.' });
        }

        const data = await response.json();
        const printfulProducts = data.result || [];

        const transformedProducts = printfulProducts
            .map(transformPrintfulProduct)
            .filter(product => product.variants.length > 0); // Filter out products that failed transformation or have no variants

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
