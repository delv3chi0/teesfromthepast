// backend/index.js

process.on('uncaughtException', (err) => {
  console.error('[Backend Log] Uncaught Exception:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Backend Log] Unhandled Rejection at:', promise, 'reason:', reason.stack || reason);
  process.exit(1);
});

import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import generateImageRoutes from './routes/generateImage.js';
import stripeWebhookRoutes from './routes/stripeWebhook.js';
import checkoutRoutes from './routes/checkout.js';
import designRoutes from './routes/designs.js'; // User's own designs
import contestRoutes from './routes/contest.js';
import orderRoutes from './routes/orders.js'; // User's own orders
import formRoutes from './routes/formRoutes.js';

// Admin Routes
import adminUserRoutes from './routes/adminUserRoutes.js';
import adminOrderRoutes from './routes/adminOrderRoutes.js';
import adminDesignRoutes from './routes/adminDesignRoutes.js';
import adminProductCategoryRoutes from './routes/adminProductCategoryRoutes.js';
import adminProductTypeRoutes from './routes/adminProductTypeRoutes.js';
import adminProductRoutes from './routes/adminProductRoutes.js';

// --- IMPORT NEW PUBLIC STOREFRONT PRODUCT ROUTES ---
import storefrontProductRoutes from './routes/storefrontProductRoutes.js';
// --- END OF NEW PUBLIC STOREFRONT PRODUCT ROUTE IMPORTS ---


const app = express();
const PORT = process.env.PORT || 5000;

console.log(`[Backend Log] Server starting with PORT: ${PORT}`);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.use(cors({
  origin: [
    'https://teesfromthepast.vercel.app',
    'https://teesfromthepast-git-main-delv3chios-projects.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true,
}));
console.log('[Backend Log] CORS middleware applied with updated origin list.');
app.use(cookieParser());

// Stripe webhook must be before express.json() for raw body
app.use('/api/stripe', stripeWebhookRoutes);
console.log('[Backend Log] Stripe webhook route configured at /api/stripe.');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
console.log('[Backend Log] Express JSON and URLencoded middleware applied with increased limits.');

app.get('/', (req, res) => {
  console.log('[Backend Log] Root path (/) hit.');
  res.send('Tees From The Past Backend API');
});
app.get('/test', (req, res) => {
  console.log('[Backend Log] Test path (/test) hit.');
  res.status(200).send('Backend is running and test route works!');
});
app.get('/health', (req, res) => {
  console.log('[Backend Log] Health path (/health) hit.');
  res.status(200).json({ status: 'OK', message: 'Backend is healthy!' });
});

console.log('[Backend Log] Setting up API routes...');
// User-facing routes
app.use('/api/auth', authRoutes);
app.use('/api', generateImageRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/mydesigns', designRoutes);
app.use('/api/contest', contestRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/forms', formRoutes);

// --- MOUNT NEW PUBLIC STOREFRONT PRODUCT ROUTES ---
app.use('/api/storefront', storefrontProductRoutes); // e.g. /api/storefront/product-types
// --- END OF MOUNTING NEW PUBLIC STOREFRONT PRODUCT ROUTES ---

// Admin-facing routes
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/designs', adminDesignRoutes);
app.use('/api/admin/product-categories', adminProductCategoryRoutes);
app.use('/api/admin/product-types', adminProductTypeRoutes);
app.use('/api/admin/products', adminProductRoutes);


console.log('[Backend Log] All routes configured, including admin inventory and public storefront routes.'); // Updated log

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Backend Log] Global Server Error:', err.message, err.stack ? `\nStack: ${err.stack}` : '');
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞 Not available in production' : err.stack,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`[Backend Log] Server successfully bound and listening on http://0.0.0.0:${PORT}`);
});
