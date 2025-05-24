// backend/index.js (Add these at the very top)

process.on('uncaughtException', (err) => {
  console.error('[Backend Log] Uncaught Exception:', err.stack);
  // It's good practice to exit gracefully after an uncaught exception
  // However, for debugging on Render, sometimes keeping it alive momentarily
  // to log more can be helpful. For now, let's keep exit for severity.
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Backend Log] Unhandled Rejection at:', promise, 'reason:', reason.stack || reason);
  // Again, for debugging, we might not exit immediately, but in production,
  // unhandled rejections often indicate critical flaws.
  process.exit(1);
});

// backend/index.js
import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config'; // Loads .env variables
import cookieParser from 'cookie-parser';
import cors from 'cors'; // For handling cross-origin requests

// Import your routes
import authRoutes from './routes/auth.js';
import generateImageRoutes from './routes/generateImage.js';
import stripeWebhookRoutes from './routes/stripeWebhook.js';
import checkoutRoutes from './routes/checkout.js'; // Assuming you have this now

const app = express();
const PORT = process.env.PORT || 5000;

// Log the PORT to ensure it's correct
console.log(`[Backend Log] Server starting with PORT: ${PORT}`);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware Order - ADJUSTED FOR CORS/OPTIONS HANDLING
console.log('[Backend Log] Applying CORS middleware...');
app.use(cors({
    origin: 'https://teesfromthepast.vercel.app', // Your Vercel frontend URL
    credentials: true, // Allow cookies to be sent
}));
console.log('[Backend Log] CORS middleware applied with origin:', 'https://teesfromthepast.vercel.app');

app.use(cookieParser());

// IMPORTANT: Stripe webhook needs raw body, so it MUST come before express.json()
// It's also crucial it's only applied to its specific path.
app.use('/api/webhook', stripeWebhookRoutes);

// General JSON body parser for ALL other routes. MOVED UP HERE.
app.use(express.json());

console.log('[Backend Log] Express JSON and other middleware applied.');


// Routes
app.get('/', (req, res) => {
    console.log('[Backend Log] Root path (/) hit.');
    res.send('Tees From The Past Backend API');
});

// Add a simple test route to ensure server is responding at all
app.get('/test', (req, res) => {
    console.log('[Backend Log] Test path (/test) hit.');
    res.status(200).send('Backend is running and test route works!');
});

// --- NEW ADDITION: Dedicated Health Check Endpoint ---
app.get('/health', (req, res) => {
    console.log('[Backend Log] Health path (/health) hit.');
    res.status(200).json({ status: 'OK', message: 'Backend is healthy!' });
});
// --- END NEW ADDITION ---

console.log('[Backend Log] Setting up /api/auth route...');
app.use('/api/auth', authRoutes); // Ensure this is correctly setup
app.use('/api', generateImageRoutes);
app.use('/api', checkoutRoutes);
console.log('[Backend Log] All routes configured.');


// Global Error Handler (Optional but Recommended)
// This should be the last middleware before app.listen()
app.use((err, req, res, next) => {
  console.error('[Backend Log] Global Server Error:', err.stack); // Use err.stack for full traceback
  res.status(500).json({ error: 'An unexpected server error occurred!' });
});


// Start the server
// --- MODIFICATION: Explicitly bind to 0.0.0.0 for Render compatibility ---
app.listen(PORT, '0.0.0.0', () => { // Added '0.0.0.0'
    console.log(`Server running on port ${PORT}`);
    console.log(`[Backend Log] Server successfully bound and listening on http://0.0.0.0:${PORT}`); // New log to confirm binding
});
// --- END MODIFICATION ---
