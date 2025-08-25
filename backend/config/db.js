// backend/config/db.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.log('[MongoDB] MONGO_URI not provided, skipping connection');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.log('[MongoDB] Continuing without database connection for testing');
  }
};

export default connectDB;
