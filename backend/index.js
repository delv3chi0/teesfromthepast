// backend/index.js
// ... (process listeners, other imports) ...
import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import generateImageRoutes from './routes/generateImage.js';
import stripeWebhookRoutes from './routes/stripeWebhook.js';
import checkoutRoutes from './routes/checkout.js';
import designRoutes from './routes/designs.js'; // This handles /api/mydesigns
import contestRoutes from './routes/contest.js'; // <-- ADD THIS IMPORT

const app = express();
// ... (PORT, DB Connection, Middleware like CORS, cookieParser, express.json limits) ...
// (Make sure all that existing setup is still there)

console.log(`[Backend Log] Server starting with PORT: ${process.env.PORT || 5000}`);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

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
app.use('/api/webhook', stripeWebhookRoutes);
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
console.log('[Backend Log] Express JSON and URLencoded middleware applied with increased limits.');

// --- Basic & Health Routes ---
app.get('/', (req, res) => { /* ... */ });
app.get('/test', (req, res) => { /* ... */ });
app.get('/health', (req, res) => { /* ... */ });


// --- API Routes ---
console.log('[Backend Log] Setting up API routes...');
app.use('/api/auth', authRoutes); 
app.use('/api', generateImageRoutes); 
app.use('/api', checkoutRoutes);
app.use('/api/mydesigns', designRoutes); 
app.use('/api/contest', contestRoutes); // <-- ADD THIS LINE to use the new contest routes
console.log('[Backend Log] All routes configured.');

// --- Global Error Handler ---
app.use((err, req, res, next) => { /* ... */ });

// --- Server Listener ---
app.listen(process.env.PORT || 5000, '0.0.0.0', () => { /* ... */ });
