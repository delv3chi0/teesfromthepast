// backend/index.js
import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config'; // Loads .env variables
import cookieParser from 'cookie-parser';
import cors from 'cors'; // For handling cross-origin requests

// Import your routes
import authRoutes from './routes/auth.js';
import generateImageRoutes from './routes/generateImage.js'; // Ensure this matches your file name
import stripeWebhookRoutes from './routes/stripeWebhook.js'; // New import for webhook
import checkoutRoutes from './routes/checkout.js'; // Assuming you'll have a checkout route

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
// CORS configuration - adjust as needed for your frontend URL
app.use(cors({
    origin: 'http://localhost:5173', // Your frontend URL during local dev (Vite default)
    credentials: true, // Allow cookies to be sent
}));
app.use(cookieParser());

// ONLY for Stripe webhook, we need the raw body. It MUST come before express.json()
// It's crucial this webhook route is processed with raw body
app.use('/api/webhook', stripeWebhookRoutes);

// Regular express.json() for other routes
app.use(express.json());


// Routes
app.get('/', (req, res) => {
    res.send('Tees From The Past Backend API');
});

app.use('/api/auth', authRoutes);
app.use('/api', generateImageRoutes); // Your generateImage route
app.use('/api', checkoutRoutes); // Your checkout route

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
