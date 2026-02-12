import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { runAudit } from "./ai/analyze.js";

// ES Modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Increase limit to handle large smart contracts
app.use(express.json({ limit: "10mb" }));
app.use(cors());

/**
 * 1. Serve Frontend Static Files
 * This allows Render to serve your index.html, CSS, and JS from the /frontend folder.
 */
app.use(express.static(path.join(__dirname, "../frontend")));

/**
 * 2. Health Check Route
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Sential AI Backend is operational" });
});

/**
 * 3. Main Audit Route
 */
app.post("/api/analyze", async (req, res) => {
  try {
    const { contractCode } = req.body;

    if (!contractCode || contractCode.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No contract code provided. Please paste your Solidity code." 
      });
    }

    // Call the robust AI logic
    const result = await runAudit(contractCode);

    /**
     * RATE LIMIT HANDLING (503)
     * If the AI logic returns an error containing 'limit', we send a 503 status.
     * This tells the frontend to show a "High Traffic" message rather than a generic error.
     */
    if (!result.success) {
      const isRateLimit = result.error.toLowerCase().includes("limit") || 
                          result.error.toLowerCase().includes("capacity");
      
      const statusCode = isRateLimit ? 503 : 500;
      return res.status(statusCode).json(result);
    }

    // Success - Send the full analysis back to the frontend
    res.json(result);

  } catch (error) {
    console.error("Critical Route Error:", error);
    res.status(500).json({ 
      success: false, 
      error: "An internal server error occurred. Our engineers have been notified." 
    });
  }
});

/**
 * 4. Catch-all Route
 * For any other request, serve the frontend index.html (Standard SPA behavior)
 */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Sential AI v1.0 Live on Port ${PORT}`);
});
