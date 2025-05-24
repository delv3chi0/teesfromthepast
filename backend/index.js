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
import 'dotenv/config'; // Loads .env variables
import cookieParser from 'cookie-parser';
import cors from 'cors'; // For handling cross-origin requests

import authRoutes from './routes/auth.js';
import generateImageRoutes from './routes/generateImage.js';
import stripeWebhookRoutes from './routes/stripeWebhook.js';
import checkoutRoutes from './routes/checkout.js'; // Assuming you have this now

const app = express();
const PORT = process.env.PORT || 5000;

console.log(`[Backend Log] Server starting with PORT: ${PORT}`);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use((req, res, next) => {
  console.log(`[Request Logger] Method: ${req.method}, Path: ${req.path}`);
  next();
});

console.log('[Backend Log] Applying CORS middleware...');
app.use(cors({
    origin: 'https://teesfromthepast.vercel.app', // Your Vercel frontend URL
    credentials: true, // Allow cookies to be sent
}));
console.log('[Backend Log] CORS middleware applied with origin:', 'https://teesfromthepast.vercel.app');

app.use(cookieParser());

app.use('/api/webhook', stripeWebhookRoutes);

app.use(express.json());

console.log('[Backend Log] Express JSON and other middleware applied.');


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

console.log('[Backend Log] Setting up /api/auth route...');
app.use('/api/auth', authRoutes); // Ensure this is correctly setup
app.use('/api', generateImageRoutes);
app.use('/api', checkoutRoutes);
console.log('[Backend Log] All routes configured.');

app.use((err, req, res, next) => {
  console.error('[Backend Log] Global Server Error:', err.stack); // Use err.stack for full traceback
  res.status(500).json({ error: 'An unexpected server error occurred!' });
});

app.listen(PORT, '0.0.0.0', () => { // Added '0.0.0.0'
    console.log(`Server running on port ${PORT}`);
    console.log(`[Backend Log] Server successfully bound and listening on http://0.0.0.0:${PORT}`); // New log to confirm binding
});
