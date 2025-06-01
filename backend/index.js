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
import designRoutes from './routes/designs.js';
import contestRoutes from './routes/contest.js';
import orderRoutes from './routes/orders.js'; // Ensure this filename matches yours

const app = express();
const PORT = process.env.PORT || 5000;

console.log(`[Backend Log] Server starting with PORT: ${PORT}`);

mongoose.connect(process.env.MONGO\_URI)
.then(() =\> console.log('MongoDB connected successfully'))
.catch(err =\> {
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

// IMPORTANT: Stripe webhook route must come BEFORE express.json() if it needs the raw body
app.use('/api/webhook', stripeWebhookRoutes);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
console.log('[Backend Log] Express JSON and URLencoded middleware applied with increased limits.');

// --- Basic & Health Routes ---
app.get('/', (req, res) =\> {
console.log('[Backend Log] Root path (/) hit.');
res.send('Tees From The Past Backend API');
});
app.get('/test', (req, res) =\> {
console.log('[Backend Log] Test path (/test) hit.');
res.status(200).send('Backend is running and test route works\!');
});
app.get('/health', (req, res) =\> {
console.log('[Backend Log] Health path (/health) hit.');
res.status(200).json({ status: 'OK', message: 'Backend is healthy\!' });
});

// --- API Routes ---
console.log('[Backend Log] Setting up API routes...');
app.use('/api/auth', authRoutes);
app.use('/api', generateImageRoutes); // Base path for generateImageRoutes
app.use('/api/checkout', checkoutRoutes);
app.use('/api/mydesigns', designRoutes);
app.use('/api/contest', contestRoutes);
app.use('/api/orders', orderRoutes);
console.log('[Backend Log] All routes configured.');

// --- Global Error Handler ---
app.use((err, req, res, next) =\> {
console.error('[Backend Log] Global Server Error:', err.stack);
if (err.type === 'entity.too.large') {
return res.status(413).json({ message: 'Request payload is too large. Please reduce data size.' });
}
// Ensure a response is always sent
if (res.headersSent) {
return next(err);
}
res.status(500).json({ error: 'An unexpected server error occurred\!' });
});

// --- Server Listener ---
app.listen(PORT, '0.0.0.0', () =\> {
console.log(`Server running on port ${PORT}`);
console.log(`[Backend Log] Server successfully bound and listening on http://0.0.0.0:${PORT}`);
});
