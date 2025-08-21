// backend/app.js

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// create express app
const app = express();

// existing middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// ✅ Add a health check endpoint for Render
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// your other routes go here…
import authRoutes from "./routes/auth.js";
import designRoutes from "./routes/designs.js";
// etc…
app.use("/api/auth", authRoutes);
app.use("/api/mydesigns", designRoutes);
// ...and so on

export default app;
