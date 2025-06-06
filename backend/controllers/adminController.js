// backend/controllers/adminController.js
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Design from '../models/Design.js';
import ProductCategory from '../models/ProductCategory.js';
import ProductType from '../models/ProductType.js';
import Product from '../models/Product.js';

// --- USER MANAGEMENT CONTROLLERS ---
const getAllUsersAdmin = asyncHandler(async (req, res) => {
    console.log('[Admin Controller] GET /users - Fetching all users.');
    const users = await User.find({}).select('-password');
    if (users) {
        console.log(`[Admin Controller] GET /users - Found ${users.length} users.`);
        res.json(users);
    } else {
        console.error('[Admin Controller] GET /users - No users found (should not happen).');
        res.status(404).json({ message: 'No users found' });
    }
});
const getUserByIdAdmin = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    console.log(`[Admin Controller] GET /users/${userId} - Fetching user by ID.`);
    const user = await User.findById(userId).select('-password');
    if (user) {
        console.log(`[Admin Controller] GET /users/${userId} - User found: ${user.username}`);
        res.json(user);
    } else {
        console.warn(`[Admin Controller] GET /users/${userId} - User not found.`);
        res.status(404);
        throw new Error('User not found');
    }
});
const updateUserAdmin = asyncHandler(async (req, res) => {
    const userIdToUpdate = req.params.id;
    console.log(`[Admin Controller] PUT /users/${userIdToUpdate} - Attempting to update user.`);
    console.log(`[Admin Controller] Request body:`, req.body);
    const user = await User.findById(userIdToUpdate);
    if (user) {
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        user.firstName = req.body.firstName !== undefined ? req.body.firstName : user.firstName;
        user.lastName = req.body.lastName !== undefined ? req.body.lastName : user.lastName;
        if (req.body.isAdmin !== undefined) {
            if (req.user._id.toString() === user._id.toString() && user.isAdmin && req.body.isAdmin === false) {
                console.warn(`[Admin Controller] PUT /users/${userIdToUpdate} - Admin ${req.user.username} attempted to remove their own admin status. Denied.`);
                res.status(400);
                throw new Error('Admins cannot remove their own admin status.');
            }
            user.isAdmin = req.body.isAdmin;
        }
        if (req.body.password) {
            console.warn(`[Admin Controller] PUT /users/${userIdToUpdate} - Direct password update in admin an update for user profile is generally not advised without specific flow. If you intended to change it via a special admin function and set user.password, the pre-save hook would hash it.`);
        }
        const updatedUser = await user.save();
        console.log(`[Admin Controller] PUT /users/${userIdToUpdate} - User ${updatedUser.username} updated successfully.`);
        const userToSend = { ...updatedUser.toObject() };
        delete userToSend.password;
        res.json(userToSend);
    } else {
        console.warn(`[Admin Controller] PUT /users/${userIdToUpdate} - User not found for update.`);
        res.status(404);
        throw new Error('User not found');
    }
});
const deleteUserAdmin = asyncHandler(async (req, res) => {
    const userIdToDelete = req.params.id;
    console.log(`[Admin Controller] DELETE /users/${userIdToDelete} - Attempting to delete user.`);
    if (req.user._id.toString() === userIdToDelete) {
        console.warn(`[Admin Controller] DELETE /users/${userIdToDelete} - Admin ${req.user.username} attempted to delete their own account. Denied.`);
        res.status(400);
        throw new Error('Admins cannot delete their own account.');
    }
    const user = await User.findById(userIdToDelete);
    if (user) {
        await User.deleteOne({ _id: user._id });
        console.log(`[Admin Controller] DELETE /users/${userIdToDelete} - User ${user.username} deleted successfully.`);
        res.json({ message: 'User removed successfully' });
    } else {
        console.warn(`[Admin Controller] DELETE /users/${userIdToDelete} - User not found for deletion.`);
        res.status(404);
        throw new Error('User not found');
    }
});

// --- ORDER MANAGEMENT CONTROLLERS ---
const getAllOrdersAdmin = asyncHandler(async (req, res) => {
    console.log('[Admin Controller] GET /orders - Fetching all orders.');
    const orders = await Order.find({})
        .populate('user', 'id username email')
        .sort({ createdAt: -1 });
    if (orders) {
        console.log(`[Admin Controller] GET /orders - Found ${orders.length} orders.`);
        res.json(orders);
    } else {
        console.log('[Admin Controller] GET /orders - No orders found.');
        res.json([]);
    }
});

// --- THIS IS THE NEW FUNCTION ---
const deleteOrderAdmin = asyncHandler(async (req, res) => {
    const orderId = req.params.id;
    console.log(`[Admin Controller] DELETE /orders/${orderId} - Attempting to delete order.`);
    const order = await Order.findById(orderId);
    if (order) {
        await Order.deleteOne({ _id: orderId });
        console.log(`[Admin Controller] Order ${orderId} deleted successfully.`);
        res.json({ message: 'Order removed successfully' });
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});
// --- END OF NEW FUNCTION ---

// --- DESIGN MANAGEMENT CONTROLLERS ---
const getAllDesignsAdmin = asyncHandler(async (req, res) => {
    console.log('[Admin Controller] GET /designs - Fetching all designs.');
    const designs = await Design.find({})
        .populate('user', 'id username email')
        .sort({ createdAt: -1 });
    if (designs) {
        console.log(`[Admin Controller] GET /designs - Found ${designs.length} designs.`);
        res.json(designs);
    } else {
        console.log('[Admin Controller] GET /designs - No designs found.');
        res.json([]);
    }
});

// --- PRODUCT CATEGORY MANAGEMENT ---
const createProductCategoryAdmin = asyncHandler(async (req, res) => {
    const { name, description, isActive } = req.body;
    console.log('[Admin Controller] POST /product-categories - Creating category:', { name, description, isActive });
    const categoryExists = await ProductCategory.findOne({ name });
    if (categoryExists) {
        res.status(400);
        throw new Error(`Product category '${name}' already exists`);
    }
    const category = new ProductCategory({ name, description, isActive: isActive !== undefined ? isActive : true });
    const createdCategory = await category.save();
    console.log('[Admin Controller] Category created:', createdCategory.name);
    res.status(201).json(createdCategory);
});
const getProductCategoriesAdmin = asyncHandler(async (req, res) => {
    console.log('[Admin Controller] GET /product-categories - Fetching all categories.');
    const categories = await ProductCategory.find({}).sort({ name: 1 });
    res.json(categories);
});
const getProductCategoryByIdAdmin = asyncHandler(async (req, res) => {
    const categoryId = req.params.id;
    console.log(`[Admin Controller] GET /product-categories/${categoryId} - Fetching category by ID.`);
    const category = await ProductCategory.findById(categoryId);
    if (category) {
        res.json(category);
    } else {
        res.status(404);
        throw new Error('Product category not found');
    }
});
const updateProductCategoryAdmin = asyncHandler(async (req, res) => {
    const categoryId = req.params.id;
    const { name, description, isActive } = req.body;
    console.log(`[Admin Controller] PUT /product-categories/${categoryId} - Updating category:`, { name, description, isActive });
    const category = await ProductCategory.findById(categoryId);
    if (category) {
        if (name && name !== category.name) {
            const categoryExists = await ProductCategory.findOne({ name: name, _id: { $ne: categoryId } });
            if (categoryExists) {
                res.status(400);
                throw new Error(`Product category name '${name}' already exists.`);
            }
        }
        category.name = name || category.name;
        category.description = description !== undefined ? description : category.description;
        category.isActive = isActive !== undefined ? isActive : category.isActive;
        const updatedCategory = await category.save();
        console.log('[Admin Controller] Category updated:', updatedCategory.name);
        res.json(updatedCategory);
    } else {
        res.status(404);
        throw new Error('Product category not found');
    }
});
const deleteProductCategoryAdmin = asyncHandler(async (req, res) => {
    const categoryId = req.params.id;
    console.log(`[Admin Controller] DELETE /product-categories/${categoryId} - Deleting category.`);
    const category = await ProductCategory.findById(categoryId);
    if (category) {
        const productTypeUsingCategory = await ProductType.findOne({ category: categoryId });
        if (productTypeUsingCategory) {
            res.status(400);
            throw new Error('Cannot delete category. It is currently in use by one or more product types.');
        }
        await ProductCategory.deleteOne({ _id: categoryId });
        console.log('[Admin Controller] Category deleted:', category.name);
        res.json({ message: 'Product category removed' });
    } else {
        res.status(404);
        throw new Error('Product category not found');
    }
});

// --- PRODUCT TYPE MANAGEMENT ---
const createProductTypeAdmin = asyncHandler(async (req, res) => {
    const { name, category: categoryId, description, isActive } = req.body;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        res.status(400);
        throw new Error('Invalid Product Category ID format.');
    }
    const categoryExists = await ProductCategory.findById(categoryId);
    if (!categoryExists) {
        res.status(400);
        throw new Error('Selected product category does not exist.');
    }
    const typeExists = await ProductType.findOne({ name });
    if (typeExists) {
        res.status(400);
        throw new Error(`Product type '${name}' already exists`);
    }
    const productType = new ProductType({ name, category: categoryId, description, isActive: isActive !== undefined ? isActive : true });
    const createdProductType = await productType.save();
    res.status(201).json(createdProductType);
});
const getProductTypesAdmin = asyncHandler(async (req, res) => {
    const productTypes = await ProductType.find({}).populate('category', 'name').sort({ name: 1 });
    res.json(productTypes);
});
const getProductTypeByIdAdmin = asyncHandler(async (req, res) => {
    const productType = await ProductType.findById(req.params.id).populate('category', 'name description');
    if (productType) {
        res.json(productType);
    } else {
        res.status(404);
        throw new Error('Product type not found');
    }
});
const updateProductTypeAdmin = asyncHandler(async (req, res) => {
    const { name, category: categoryId, description, isActive } = req.body;
    const productType = await ProductType.findById(req.params.id);
    if (productType) {
        if (name && name !== productType.name) {
            const typeExists = await ProductType.findOne({ name: name, _id: { $ne: req.params.id } });
            if (typeExists) {
                res.status(400);
                throw new Error(`Product type name '${name}' already exists.`);
            }
        }
        productType.name = name || productType.name;
        if (categoryId) {
            if (!mongoose.Types.ObjectId.isValid(categoryId)) {
                res.status(400);
                throw new Error('Invalid Product Category ID format for update.');
            }
            const categoryExists = await ProductCategory.findById(categoryId);
            if (!categoryExists) {
                res.status(400);
                throw new Error('Selected product category for update does not exist.');
            }
            productType.category = categoryId;
        }
        productType.description = description !== undefined ? description : productType.description;
        productType.isActive = isActive !== undefined ? isActive : productType.isActive;
        const updatedProductType = await productType.save();
        await updatedProductType.populate('category', 'name');
        res.json(updatedProductType);
    } else {
        res.status(404);
        throw new Error('Product type not found');
    }
});
const deleteProductTypeAdmin = asyncHandler(async (req, res) => {
    const productType = await ProductType.findById(req.params.id);
    if (productType) {
        const productUsingType = await Product.findOne({ productType: req.params.id });
        if (productUsingType) {
            res.status(400);
            throw new Error('Cannot delete type. It is currently in use by one or more products.');
        }
        await ProductType.deleteOne({ _id: req.params.id });
        res.json({ message: 'Product type removed' });
    } else {
        res.status(404);
        throw new Error('Product type not found');
    }
});

// --- PRODUCT MANAGEMENT ---
const createProductAdmin = asyncHandler(async (req, res) => {
    const { name, productType: productTypeId, description, basePrice, tags, isActive, variants } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productTypeId)) {
        res.status(400);
        throw new Error('Invalid Product Type ID format.');
    }
    const productTypeExists = await ProductType.findById(productTypeId);
    if (!productTypeExists) {
        res.status(400);
        throw new Error('Selected product type does not exist.');
    }
    if (variants && !Array.isArray(variants)) {
        res.status(400);
        throw new Error('Variants must be an array.');
    }
    if (variants) {
        const skusInRequest = [];
        for (const v of variants) {
            if (!v.sku || !v.colorName || !v.size || v.stock === undefined || !v.imageMockupFront) {
                res.status(400);
                throw new Error('Each variant must have sku, colorName, size, stock, and imageMockupFront.');
            }
            if (skusInRequest.includes(v.sku)) {
                res.status(400);
                throw new Error(`Duplicate SKU '${v.sku}' found within the submitted variants. SKUs must be unique per product creation.`);
            }
            skusInRequest.push(v.sku);
            const skuExistsGlobally = await Product.findOne({ 'variants.sku': v.sku });
            if (skuExistsGlobally) {
                res.status(400);
                throw new Error(`SKU '${v.sku}' already exists. SKUs must be globally unique.`);
            }
        }
    }
    const product = new Product({ name, productType: productTypeId, description, basePrice, tags: tags || [], isActive: isActive !== undefined ? isActive : true, variants: variants || [] });
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
});
const getProductsAdmin = asyncHandler(async (req, res) => {
    const products = await Product.find({}).populate({ path: 'productType', select: 'name category isActive', populate: { path: 'category', select: 'name isActive' } }).sort({ name: 1 });
    res.json(products);
});
const getProductByIdAdmin = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate({ path: 'productType', select: 'name category isActive', populate: { path: 'category', select: 'name isActive' } });
    if (product) {
        res.json(product);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});
const updateProductAdmin = asyncHandler(async (req, res) => {
    const { name, productType: productTypeId, description, basePrice, tags, isActive, variants } = req.body;
    const product = await Product.findById(req.params.id);
    if (product) {
        product.name = name || product.name;
        product.description = description !== undefined ? description : product.description;
        product.basePrice = basePrice !== undefined ? basePrice : product.basePrice;
        product.tags = tags !== undefined ? tags : product.tags;
        product.isActive = isActive !== undefined ? isActive : product.isActive;
        if (productTypeId) {
            if (!mongoose.Types.ObjectId.isValid(productTypeId)) {
                res.status(400);
                throw new Error('Invalid Product Type ID format for update.');
            }
            const productTypeExists = await ProductType.findById(productTypeId);
            if (!productTypeExists) {
                res.status(400);
                throw new Error('Selected product type for update does not exist.');
            }
            product.productType = productTypeId;
        }
        if (variants !== undefined) {
            if (!Array.isArray(variants)) {
                res.status(400);
                throw new Error('Variants must be an array.');
            }
            const newSkusInRequest = [];
            for (const v of variants) {
                if (!v.sku || !v.colorName || !v.size || v.stock === undefined || !v.imageMockupFront) {
                    res.status(400);
                    throw new Error('Each variant must have sku, colorName, size, stock, and imageMockupFront.');
                }
                if (newSkusInRequest.includes(v.sku)) {
                    res.status(400);
                    throw new Error(`Duplicate SKU '${v.sku}' found within the submitted variants for update.`);
                }
                newSkusInRequest.push(v.sku);
                const skuExistsElsewhere = await Product.findOne({ 'variants.sku': v.sku, _id: { $ne: req.params.id } });
                if (skuExistsElsewhere) {
                    res.status(400);
                    throw new Error(`SKU '${v.sku}' already exists in another product. SKUs must be globally unique.`);
                }
            }
            product.variants = variants;
        }
        const updatedProduct = await product.save();
        await updatedProduct.populate({ path: 'productType', select: 'name category isActive', populate: { path: 'category', select: 'name isActive' } });
        res.json(updatedProduct);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});
const deleteProductAdmin = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        await Product.deleteOne({ _id: req.params.id });
        res.json({ message: 'Product removed' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

export {
    getAllUsersAdmin,
    getUserByIdAdmin,
    updateUserAdmin,
    deleteUserAdmin,
    getAllOrdersAdmin,
    deleteOrderAdmin,
    getAllDesignsAdmin,
    createProductCategoryAdmin,
    getProductCategoriesAdmin,
    getProductCategoryByIdAdmin,
    updateProductCategoryAdmin,
    deleteProductCategoryAdmin,
    createProductTypeAdmin,
    getProductTypesAdmin,
    getProductTypeByIdAdmin,
    updateProductTypeAdmin,
    deleteProductTypeAdmin,
    createProductAdmin,
    getProductsAdmin,
    getProductByIdAdmin,
    updateProductAdmin,
    deleteProductAdmin
};
