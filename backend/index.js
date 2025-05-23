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
console.log(`[Backend Log] Server starting with PORT: ${PORT}`); // NEW LOG

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
console.log('[Backend Log] Applying CORS middleware...'); // NEW LOG
// CORS configuration - THIS IS THE IMPORTANT CHANGE!
app.use(cors({
    origin: 'https://teesfromthepast-frontend.vercel.app', // Your Vercel frontend URL
    credentials: true, // Allow cookies to be sent
}));
console.log('[Backend Log] CORS middleware applied with origin:', 'https://teesfromthepast-frontend.vercel.app'); // NEW LOG
app.use(cookieParser());

// ONLY for Stripe webhook, we need the raw body. It MUST come before express.json()
// It's crucial this webhook route is processed with raw body
app.use('/api/webhook', stripeWebhookRoutes);

// Regular express.json() for other routes
app.use(express.json());

console.log('[Backend Log] Express JSON and other middleware applied.'); // NEW LOG


// Routes
app.get('/', (req, res) => {
    console.log('[Backend Log] Root path (/) hit.'); // NEW LOG
    res.send('Tees From The Past Backend API');
});

// Add a simple test route to ensure server is responding at all
app.get('/test', (req, res) => { // NEW TEST ROUTE
    console.log('[Backend Log] Test path (/test) hit.'); // NEW LOG
    res.status(200).send('Backend is running and test route works!');
});

console.log('[Backend Log] Setting up /api/auth route...'); // NEW LOG
app.use('/api/auth', authRoutes); // Ensure this is correctly setup
app.use('/api', generateImageRoutes);
app.use('/api', checkoutRoutes);
console.log('[Backend Log] All routes configured.'); // NEW LOG


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
