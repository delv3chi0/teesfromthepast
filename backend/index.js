// Load env and libs
require('dotenv').config();
console.log('✅ .env loaded, JWT_SECRET is:', process.env.JWT_SECRET);

const express       = require('express');
const mongoose      = require('mongoose');
const bcrypt        = require('bcryptjs');
const cookieParser  = require('cookie-parser');
const cors          = require('cors');
const Bull          = require('bull');
const jwt           = require('jsonwebtoken');
const { OpenAI }    = require('openai');

// Init Express
const app = express();
const corsOptions = {
  origin: 'https://teesfromthepast.vercel.app',
  credentials: true
};
app.options('*', cors(corsOptions));

// ✅ CORS setup
app.options('*', cors(corsOptions)); // Handles preflight for all routes

// ✅ Core middleware
app.use(express.json());
app.use(cookieParser());

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Auth routes
console.log('🔌 Mounting auth routes at /api');
app.use('/api', require('./routes/auth'));

// ✅ Bull queue for post scheduling
const scheduleQueue = new Bull('scheduleQueue', process.env.REDIS_URL || 'redis://127.0.0.1:6379');
scheduleQueue.on('error', err => console.error('🚨 Bull Error:', err));
scheduleQueue.process(job => {
  console.log('🕒 Processing job:', job.data);
  // TODO: actually send/schedule the post here
});

// ✅ Ping test route
app.get('/ping', (_req, res) => {
  console.log('🔔  /ping hit');
  res.send('pong');
});

// ✅ Caption generator route
app.post('/api/generate-caption', async (req, res) => {
  try {
    const { draftText, tone, platform } = req.body;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `${tone} caption for ${platform}: ${draftText}`;
    const response = await openai.completions.create({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 60
    });
    res.json({ caption: response.choices[0].text.trim() });
  } catch (error) {
    console.error('❌ Error generating caption:', error);
    res.status(500).json({ error: 'Failed to generate caption' });
  }
});

// ✅ Analytics route
app.get('/api/analytics', (_req, res) => {
  console.log('📊  /api/analytics hit');
  res.json({ data: [] });
});

// ✅ Custom routes
app.use('/api/generate', require('./routes/generateImage'));
app.use('/api/stripe', require('./routes/stripeWebhook'));

// ✅ Graceful shutdown
async function gracefulShutdown() {
  console.log('🛑 Shutting down...');
  await server.close();
  await mongoose.disconnect();
  await scheduleQueue.close();
  console.log('✅ Shutdown complete');
  process.exit(0);
}
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
