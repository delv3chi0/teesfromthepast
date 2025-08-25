// backend/config/db.js
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import { 
  initializeSlowQueryMonitoring, 
  startPeriodicMetricsLogging 
} from "../utils/slowQueryMonitor.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info("MongoDB connected", { 
      host: conn.connection.host,
      database: conn.connection.name 
    });
    
    // Initialize slow query monitoring
    initializeSlowQueryMonitoring();
    
    // Start periodic metrics logging (every 5 minutes)
    startPeriodicMetricsLogging();
    
  } catch (error) {
    logger.error("Error connecting to MongoDB", { 
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  }
};

export default connectDB;
