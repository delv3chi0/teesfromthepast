// backend/app.js

import express from 'express';
import mongoose from 'mongoose'; // This import is not directly used in app.js, but often in index.js for connection
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize'; // Import for NoSQL injection prevention
import hpp from 'hpp'; // Import for HTTP Parameter Pollution prevention
import xss from 'xss-clean'; // Import for Cross-Site Scripting (XSS) prevention

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
import adminProductRoutes from './routes/adminProductRoutes.js';
import storefrontProductRoutes from './routes/storefrontProductRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const app = express();

// --- Middleware Configuration ---

// Enable trust proxy for express-rate-limit and other IP-dependent middleware
// This is crucial when running behind a proxy like Render
app.set('trust proxy', 1); // ADDED THIS LINE

// Apply essential security headers
app.use(helmet());

// CORS configuration to allow your frontend to connect
const allowedOrigins = [
    'https://teesfromthepast.vercel.app',
    'http://localhost:5173'
];
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        // Or if the origin is in the allowed list
        // Or if the origin is a Vercel deployment subdomain
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('-delv3chios-projects.vercel.app')) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow cookies/authorization headers to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed request headers
};
app.use(cors(corsOptions));

// Cookie parser to read cookies
app.use(cookieParser());

// Special route for Stripe webhook before body parsing
// Stripe webhooks require the raw body, so this must come before express.json()
app.use('/api/stripe', stripeWebhookRoutes);

// Body parsers with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Sanitize data (NoSQL query injection prevention)
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Prevent http param pollution
app.use(hpp());

// Rate limiter to protect API routes from spam/abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', limiter); // Apply rate limiter to all /api routes

// --- Route Definitions ---

app.get('/', (req, res) => {
    res.send('Tees From The Past Backend API');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Backend is healthy!' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', generateImageRoutes); // Assuming this handles /api/generate etc.
app.use('/api/checkout', checkoutRoutes);
app.use('/api/mydesigns', designRoutes);
app.use('/api/contest', contestRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/storefront', storefrontProductRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/designs', adminDesignRoutes);
app.use('/api/admin/', adminProductRoutes); // This route now handles all product CRUD for admin
app.use('/api', uploadRoutes); // NEW: Mount the upload routes for Cloudinary

// This should be the last middleware in your chain
app.use((err, req, res, next) => {
    console.error('[Backend Log] Global Server Error:', err.message, err.stack ? `\nStack: ${err.stack}` : '');
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode; // If status was 200, set to 500
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack, // Provide stack in dev, simple emoji in prod
    });
});

export default app;
