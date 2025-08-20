// backend/index.js
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import mongoose from "mongoose";
import app from "./app.js";

const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;

async function start() {
  if (!MONGODB_URI) {
    console.error("[Startup] Missing MONGODB_URI");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("[Backend Log] Connected to MongoDB");
  } catch (e) {
    console.error("[Backend Log] Mongo connection error:", e?.message);
    process.exit(1);
  }

  const server = http.createServer(app);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
    console.log(`[Backend Log] Server successfully bound and listening on http://0.0.0.0:${PORT}`);
  });
}

start();
