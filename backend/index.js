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
    origin: 'https://teesfromthepast-frontend.vercel.app', // Your Vercel frontend URL
    credentials: true, // Allow cookies to be sent
}));
console.log('[Backend Log] CORS middleware applied with origin:', 'https://teesfromthepast-frontend.vercel.app');

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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
