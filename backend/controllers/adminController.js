// backend/controllers/adminController.js
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose'; // Added for mongoose.Types.ObjectId.isValid
import User from '../models/User.js';
import Order from '../models/Order.js';
import Design from '../models/Design.js';

// --- NEW MODEL IMPORTS FOR INVENTORY ---
import ProductCategory from '../models/ProductCategory.js';
import ProductType from '../models/ProductType.js';
import Product from '../models/Product.js';
// --- END OF NEW MODEL IMPORTS ---

// --- USER MANAGEMENT CONTROLLERS ---

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsersAdmin = asyncHandler(async (req, res) => {
  console.log('[Admin Controller] GET /users - Fetching all users.');
  const users = await User.find({}).select('-password'); // Exclude password
  if (users) {
    console.log(`[Admin Controller] GET /users - Found ${users.length} users.`);
    res.json(users);
  } else {
    // This case is unlikely if the DB is responsive, more likely to return an empty array.
    console.error('[Admin Controller] GET /users - No users found (should not happen).');
    res.status(404).json({ message: 'No users found' }); // Send JSON response
  }
});

// @desc    Get user by ID (admin)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
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

// @desc    Update user (admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
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

    // Admin controller should not directly change password here.
    // If password change is needed for a user by an admin, it should be a separate, deliberate flow.
    // For example, an admin might trigger a password reset for the user.
    if (req.body.password) {
      // If password was changed, it should have been done through a specific admin password change/reset mechanism.
      // We do NOT directly set user.password = req.body.password here without hashing.
      // The User model's pre-save hook handles hashing if user.password is set.
      // However, for admin updates, explicitly ignoring direct password field unless intended is safer.
      console.warn(`[Admin Controller] PUT /users/${userIdToUpdate} - Direct password update in admin an update for user profile is generally not advised without specific flow. If you intended to change it via a special admin function and set user.password, the pre-save hook would hash it.`);
       // If you have a specific field for admin-initiated password changes, handle it here.
       // For example, if an admin sets `newPassword` field:
       // if (req.body.newPassword) {
       //    user.password = req.body.newPassword; // The pre-save hook in User.js will hash this
       // }
    }

    const updatedUser = await user.save();
    console.log(`[Admin Controller] PUT /users/${userIdToUpdate} - User ${updatedUser.username} updated successfully.`);
    
    const userToSend = { ...updatedUser.toObject() };
    delete userToSend.password; // Ensure password is not sent back
    res.json(userToSend);
  } else {
    console.warn(`[Admin Controller] PUT /users/${userIdToUpdate} - User not found for update.`);
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Delete user (admin)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
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
    // TODO: Consider what to do with associated data (orders, designs by this user).
    // For now, it just deletes the user. You might nullify user fields on orders/designs,
    // or prevent deletion if critical data exists.
    await User.deleteOne({ _id: user._id }); // Replaced user.remove() for Mongoose v6+
    console.log(`[Admin Controller] DELETE /users/${userIdToDelete} - User ${user.username} deleted successfully.`);
    res.json({ message: 'User removed successfully' });
  } else {
    console.warn(`[Admin Controller] DELETE /users/${userIdToDelete} - User not found for deletion.`);
    res.status(404);
    throw new Error('User not found');
  }
});


// --- ORDER MANAGEMENT CONTROLLERS ---

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  console.log('[Admin Controller] GET /orders - Fetching all orders.');
  // Consider adding pagination for large numbers of orders
  const orders = await Order.find({})
    .populate('user', 'id username email') // Populate basic user info
    .sort({ createdAt: -1 }); // Sort by newest first
  
  if (orders) {
    console.log(`[Admin Controller] GET /orders - Found ${orders.length} orders.`);
    res.json(orders); // Send the orders array directly, which is what AdminPage.jsx expects based on `r.data.orders || r.data || []`
  } else {
    // Unlikely to be null, more likely an empty array if no orders
    console.log('[Admin Controller] GET /orders - No orders found.');
    res.json([]); // Send an empty array if no orders
  }
});

// --- DESIGN MANAGEMENT CONTROLLERS ---

// @desc    Get all designs (admin)
// @route   GET /api/admin/designs
// @access  Private/Admin
const getAllDesignsAdmin = asyncHandler(async (req, res) => {
  console.log('[Admin Controller] GET /designs - Fetching all designs.');
  // Consider adding pagination
  const designs = await Design.find({})
    .populate('user', 'id username email') // Populate basic user info (creator)
    .sort({ createdAt: -1 });
  
  if (designs) {
    console.log(`[Admin Controller] GET /designs - Found ${designs.length} designs.`);
    res.json(designs); // Send the designs array directly
  } else {
    console.log('[Admin Controller] GET /designs - No designs found.');
    res.json([]); // Send an empty array if no designs
  }
});

// --- PRODUCT CATEGORY MANAGEMENT ---

// @desc    Create a new product category
// @route   POST /api/admin/product-categories (to be created in routes)
// @access  Private/Admin
const createProductCategoryAdmin = asyncHandler(async (req, res) => {
  const { name, description, isActive } = req.body;
  console.log('[Admin Controller] POST /product-categories - Creating category:', { name, description, isActive });

  const categoryExists = await ProductCategory.findOne({ name });
  if (categoryExists) {
    res.status(400);
    throw new Error(`Product category '${name}' already exists`);
  }

  const category = new ProductCategory({
    name,
    description,
    isActive: isActive !== undefined ? isActive : true, // Default to true if not provided
  });

  const createdCategory = await category.save();
  console.log('[Admin Controller] Category created:', createdCategory.name);
  res.status(201).json(createdCategory);
});

// @desc    Get all product categories
// @route   GET /api/admin/product-categories (to be created in routes)
// @access  Private/Admin
const getProductCategoriesAdmin = asyncHandler(async (req, res) => {
  console.log('[Admin Controller] GET /product-categories - Fetching all categories.');
  const categories = await ProductCategory.find({}).sort({ name: 1 });
  res.json(categories);
});

// @desc    Get product category by ID
// @route   GET /api/admin/product-categories/:id (to be created in routes)
// @access  Private/Admin
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

// @desc    Update a product category
// @route   PUT /api/admin/product-categories/:id (to be created in routes)
// @access  Private/Admin
const updateProductCategoryAdmin = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  const { name, description, isActive } = req.body;
  console.log(`[Admin Controller] PUT /product-categories/${categoryId} - Updating category:`, { name, description, isActive });

  const category = await ProductCategory.findById(categoryId);

  if (category) {
    // Check if name is being changed and if the new name already exists (excluding current document)
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

// @desc    Delete a product category
// @route   DELETE /api/admin/product-categories/:id (to be created in routes)
// @access  Private/Admin
const deleteProductCategoryAdmin = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  console.log(`[Admin Controller] DELETE /product-categories/${categoryId} - Deleting category.`);
  const category = await ProductCategory.findById(categoryId);

  if (category) {
    // Optional: Check if any ProductType uses this category before deleting
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

// @desc    Create a new product type
// @route   POST /api/admin/product-types (to be created in routes)
// @access  Private/Admin
const createProductTypeAdmin = asyncHandler(async (req, res) => {
  const { name, category: categoryId, description, isActive } = req.body;
  console.log('[Admin Controller] POST /product-types - Creating type:', { name, categoryId, description });

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

  const productType = new ProductType({
    name,
    category: categoryId,
    description,
    isActive: isActive !== undefined ? isActive : true,
  });

  const createdProductType = await productType.save();
  console.log('[Admin Controller] Product type created:', createdProductType.name);
  res.status(201).json(createdProductType);
});

// @desc    Get all product types
// @route   GET /api/admin/product-types (to be created in routes)
// @access  Private/Admin
const getProductTypesAdmin = asyncHandler(async (req, res) => {
  console.log('[Admin Controller] GET /product-types - Fetching all types.');
  const productTypes = await ProductType.find({})
    .populate('category', 'name') // Populate category name
    .sort({ name: 1 });
  res.json(productTypes);
});

// @desc    Get product type by ID
// @route   GET /api/admin/product-types/:id (to be created in routes)
// @access  Private/Admin
const getProductTypeByIdAdmin = asyncHandler(async (req, res) => {
  const typeId = req.params.id;
  console.log(`[Admin Controller] GET /product-types/${typeId} - Fetching type by ID.`);
  const productType = await ProductType.findById(typeId).populate('category', 'name description');

  if (productType) {
    res.json(productType);
  } else {
    res.status(404);
    throw new Error('Product type not found');
  }
});

// @desc    Update a product type
// @route   PUT /api/admin/product-types/:id (to be created in routes)
// @access  Private/Admin
const updateProductTypeAdmin = asyncHandler(async (req, res) => {
  const typeId = req.params.id;
  const { name, category: categoryId, description, isActive } = req.body;
  console.log(`[Admin Controller] PUT /product-types/${typeId} - Updating type:`, { name, categoryId, description, isActive });

  const productType = await ProductType.findById(typeId);

  if (productType) {
    if (name && name !== productType.name) {
        const typeExists = await ProductType.findOne({ name: name, _id: { $ne: typeId } });
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
    // Repopulate after save to send back updated category info if it was changed
    await updatedProductType.populate('category', 'name');
    console.log('[Admin Controller] Product type updated:', updatedProductType.name);
    res.json(updatedProductType);
  } else {
    res.status(404);
    throw new Error('Product type not found');
  }
});

// @desc    Delete a product type
// @route   DELETE /api/admin/product-types/:id (to be created in routes)
// @access  Private/Admin
const deleteProductTypeAdmin = asyncHandler(async (req, res) => {
  const typeId = req.params.id;
  console.log(`[Admin Controller] DELETE /product-types/${typeId} - Deleting type.`);
  const productType = await ProductType.findById(typeId);

  if (productType) {
    // Optional: Check if any Product uses this type before deleting
    const productUsingType = await Product.findOne({ productType: typeId });
    if (productUsingType) {
      res.status(400);
      throw new Error('Cannot delete type. It is currently in use by one or more products.');
    }
    await ProductType.deleteOne({ _id: typeId });
    console.log('[Admin Controller] Product type deleted:', productType.name);
    res.json({ message: 'Product type removed' });
  } else {
    res.status(404);
    throw new Error('Product type not found');
  }
});

// --- PRODUCT MANAGEMENT ---

// @desc    Create a new product
// @route   POST /api/admin/products (to be created in routes)
// @access  Private/Admin
const createProductAdmin = asyncHandler(async (req, res) => {
  const { name, productType: productTypeId, description, basePrice, tags, isActive, variants } = req.body;
  console.log('[Admin Controller] POST /products - Creating product:', { name, productTypeId, description, basePrice, tags, isActive, /* variants can be large, omitting from this log */ });

  if (!mongoose.Types.ObjectId.isValid(productTypeId)) {
    res.status(400);
    throw new Error('Invalid Product Type ID format.');
  }
  const productTypeExists = await ProductType.findById(productTypeId);
  if (!productTypeExists) {
    res.status(400);
    throw new Error('Selected product type does not exist.');
  }

  // Basic validation for variants if provided
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

  const product = new Product({
    name,
    productType: productTypeId,
    description,
    basePrice,
    tags: tags || [],
    isActive: isActive !== undefined ? isActive : true,
    variants: variants || [],
  });

  const createdProduct = await product.save();
  console.log('[Admin Controller] Product created:', createdProduct.name);
  res.status(201).json(createdProduct);
});

// @desc    Get all products (admin)
// @route   GET /api/admin/products (to be created in routes)
// @access  Private/Admin
const getProductsAdmin = asyncHandler(async (req, res) => {
  console.log('[Admin Controller] GET /products - Fetching all products.');
  const products = await Product.find({})
    .populate({
        path: 'productType',
        select: 'name category isActive', // Select fields from ProductType
        populate: {
            path: 'category', // Populate the category field within ProductType
            select: 'name isActive' // Select fields from ProductCategory
        }
    })
    .sort({ name: 1 });
  res.json(products);
});

// @desc    Get product by ID (admin)
// @route   GET /api/admin/products/:id (to be created in routes)
// @access  Private/Admin
const getProductByIdAdmin = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  console.log(`[Admin Controller] GET /products/${productId} - Fetching product by ID.`);
  const product = await Product.findById(productId)
    .populate({
        path: 'productType',
        select: 'name category isActive',
        populate: {
            path: 'category',
            select: 'name isActive'
        }
    });

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Update a product (admin)
// @route   PUT /api/admin/products/:id (to be created in routes)
// @access  Private/Admin
const updateProductAdmin = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const { name, productType: productTypeId, description, basePrice, tags, isActive, variants } = req.body;
  console.log(`[Admin Controller] PUT /products/${productId} - Updating product:`, { name, productTypeId, description, basePrice, tags, isActive /* variants omitted */});

  const product = await Product.findById(productId);

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

            const skuExistsElsewhere = await Product.findOne({ 'variants.sku': v.sku, _id: { $ne: productId } });
            if (skuExistsElsewhere) {
                res.status(400);
                throw new Error(`SKU '${v.sku}' already exists in another product. SKUs must be globally unique.`);
            }
        }
        product.variants = variants; // Replace the entire variants array
    }

    const updatedProduct = await product.save();
    await updatedProduct.populate({ // Repopulate for consistent response
        path: 'productType',
        select: 'name category isActive',
        populate: {
            path: 'category',
            select: 'name isActive'
        }
    });
    console.log('[Admin Controller] Product updated:', updatedProduct.name);
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Delete a product (admin)
// @route   DELETE /api/admin/products/:id (to be created in routes)
// @access  Private/Admin
const deleteProductAdmin = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  console.log(`[Admin Controller] DELETE /products/${productId} - Deleting product.`);
  const product = await Product.findById(productId);

  if (product) {
    // Optional: Check if product is in any non-completed orders before deleting.
    // For now, direct delete.
    await Product.deleteOne({ _id: productId });
    console.log('[Admin Controller] Product deleted:', product.name);
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
  getAllDesignsAdmin,

  // Product Category Exports
  createProductCategoryAdmin,
  getProductCategoriesAdmin,
  getProductCategoryByIdAdmin,
  updateProductCategoryAdmin,
  deleteProductCategoryAdmin,

  // Product Type Exports
  createProductTypeAdmin,
  getProductTypesAdmin,
  getProductTypeByIdAdmin,
  updateProductTypeAdmin,
  deleteProductTypeAdmin,

  // Product Exports
  createProductAdmin,
  getProductsAdmin,
  getProductByIdAdmin,
  updateProductAdmin,
  deleteProductAdmin
};
