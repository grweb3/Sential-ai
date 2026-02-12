import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Exponential Backoff Helper
 * Retries the function if it catches a 429 (Rate Limit) error.
 */
async function retryWithBackoff(fn, retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Check if the error is a rate limit (429)
      const isRateLimit = error.message?.includes("429") || error.status === 429;
      
      if (isRateLimit && i < retries - 1) {
        console.log(`[Traffic Spike] Retrying in ${delay}ms... (Attempt ${i + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Double the wait time for the next attempt
        continue;
      }
      throw error;
    }
  }
}

export async function runAudit(contractCode) {
  try {
    // Using gemini-1.5-pro for better reasoning, or flash for speed
    // If you're on a free key, 1.5-flash has higher rate limits.
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are a professional Smart Contract Security Auditor.
      Analyze the following Solidity code and return a structured JSON report.
      
      The JSON MUST follow this exact structure:
      {
        "auditReport": {
          "score": 0-10,
          "summary": "Brief overview",
          "critical": [{"title": "", "description": "", "recommendation": ""}],
          "high": [...],
          "medium": [...],
          "gas": [...],
          "practices": [...]
        }
      }

      Code to analyze:
      ${contractCode}
    `;

    // Wrap the API call in our retry logic
    const result = await retryWithBackoff(async () => {
      const chat = model.startChat();
      const response = await chat.sendMessage(prompt);
      return response.response.text();
    });

    return {
      success: true,
      analysis: JSON.parse(result)
    };

  } catch (error) {
    console.error("AI Analysis Error:", error);
    
    // Friendly error messages for the UI
    let errorMessage = "AI analysis failed";
    if (error.message?.includes("429")) {
      errorMessage = "The system is currently over capacity. Please wait 30 seconds and try again.";
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}
