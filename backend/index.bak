// backend/index.js
import mongoose from 'mongoose';
import 'dotenv/config';
import app from './app.js'; // Import the configured app from app.js

process.on('uncaughtException', (err) => {
  console.error('[Backend Log] Uncaught Exception:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Backend Log] Unhandled Rejection at:', promise, 'reason:', reason.stack || reason);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

console.log(`[Backend Log] Server starting...`);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    // Start listening for requests only after the DB connection is successful
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`[Backend Log] Server successfully bound and listening on http://0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
