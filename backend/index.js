import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url"; // Required for ES modules
import { runAudit } from "./ai/analyze.js";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cors());

// 1. SERVE FRONTEND STATIC FILES
// This tells Express: "Look in the ../frontend folder for files like index.html"
app.use(express.static(path.join(__dirname, "../frontend")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Sential AI Backend is running" });
});

app.post("/api/analyze", async (req, res) => {
  // ... (Keep your existing analyze logic exactly as it is) ...
  try {
    const { contractCode } = req.body;
    if (!contractCode || contractCode.trim().length === 0) {
      return res.status(400).json({ success: false, error: "No contract code provided" });
    }
    // ... rest of your code ...
    const result = await runAudit(contractCode);
    if (!result.success) return res.status(500).json(result);
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: "AI analysis failed" });
  }
});

// 2. CATCH-ALL ROUTE
// If a user goes to your website URL, send them index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});