import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { runAudit } from "./ai/analyze.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cors());

// Serve static frontend
app.use(express.static(path.join(__dirname, "../frontend")));

app.post("/api/analyze", async (req, res) => {
  try {
    const { contractCode } = req.body;
    
    if (!contractCode || contractCode.trim().length === 0) {
      return res.status(400).json({ success: false, error: "No contract code provided" });
    }

    const result = await runAudit(contractCode);
    
    if (!result.success) {
      // Use 503 Service Unavailable for rate limit issues
      const statusCode = result.error.includes("capacity") ? 503 : 500;
      return res.status(statusCode).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error("Route Error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Sential v1.0 running on port ${PORT}`);
});
