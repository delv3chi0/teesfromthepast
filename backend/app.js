// backend/app.js
import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Route Imports
import authRoutes from './routes/auth.js';
import generateImageRoutes from './routes/generateImage.js';
import stripeWebhookRoutes from './routes/stripeWebhook.js';
import checkoutRoutes from './routes/checkout.js';
import designRoutes from './routes/designs.js';
import contestRoutes from './routes/contest.js';
import orderRoutes from './routes/orders.js';
import formRoutes from './routes/formRoutes.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import adminOrderRoutes from './routes/adminOrderRoutes.js';
import adminDesignRoutes from './routes/adminDesignRoutes.js';
import adminProductCategoryRoutes from './routes/adminProductCategoryRoutes.js';
import adminProductTypeRoutes from './routes/adminProductTypeRoutes.js';
import adminProductRoutes from './routes/adminProductRoutes.js';
import storefrontProductRoutes from './routes/storefrontProductRoutes.js';

const app = express();

// --- Middleware Configuration ---

// Apply essential security headers
app.use(helmet());

// CORS configuration to allow your frontend to connect
const allowedOrigins = [
  'https://teesfromthepast.vercel.app',
  'http://localhost:5173'
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('-delv3chios-projects.vercel.app')) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Cookie parser to read cookies
app.use(cookieParser());

// Special route for Stripe webhook before body parsing
app.use('/api/stripe', stripeWebhookRoutes);

// Body parsers with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiter to protect API routes from spam/abuse
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, 
	standardHeaders: true,
	legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', limiter);

// --- Route Definitions ---

app.get('/', (req, res) => {
  res.send('Tees From The Past Backend API');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is healthy!' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', generateImageRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/mydesigns', designRoutes);
app.use('/api/contest', contestRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/storefront', storefrontProductRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/designs', adminDesignRoutes);
app.use('/api/admin/product-categories', adminProductCategoryRoutes);
app.use('/api/admin/product-types', adminProductTypeRoutes);
app.use('/api/admin/products', adminProductRoutes);

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('[Backend Log] Global Server Error:', err.message, err.stack ? `\nStack: ${err.stack}` : '');
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
});

export default app;
