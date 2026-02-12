import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// Sanitize API Key to remove potential whitespace/quotes from Render/Env
const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim().replace(/['"]+/g, '') : "";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * THE MODEL HIERARCHY
 * We try these in order. If one 404s or 429s, we hop to the next.
 */
const MODELS_TO_TRY = [
    "gemini-1.5-flash", 
    "gemini-1.5-pro", 
    "gemini-1.5-flash-8b",
    "gemini-1.0-pro"
];

/**
 * ADVANCED RETRY & HOP LOGIC
 * Handles 429 (Rate Limit), 503 (Overloaded), and 404 (Model Mismatch)
 */
async function smartAuditExecution(contractCode) {
    let lastError = null;

    for (const modelName of MODELS_TO_TRY) {
        let retries = 3;
        let delay = 2000;

        console.log(`🤖 Attempting Audit with: ${modelName}`);

        for (let i = 0; i < retries; i++) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const prompt = `
                    You are a professional Smart Contract Security Auditor.
                    Analyze the following Solidity code and return ONLY a structured JSON report.
                    
                    The JSON MUST follow this exact structure:
                    {
                      "auditReport": {
                        "score": 0-10,
                        "summary": "Brief overview",
                        "critical": [{"title": "", "description": "", "recommendation": ""}],
                        "high": [],
                        "medium": [],
                        "gas": [],
                        "practices": []
                      }
                    }

                    Code to analyze:
                    ${contractCode}
                `;

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json",
                    },
                });

                const responseText = result.response.text();
                return {
                    success: true,
                    modelUsed: modelName,
                    analysis: JSON.parse(responseText.trim().replace(/```json|```/g, ""))
                };

            } catch (error) {
                lastError = error;
                const status = error.status || (error.response ? error.response.status : null);

                // If 404, this model is not available for this key/region. HOP to next model immediately.
                if (status === 404 || error.message?.includes("404")) {
                    console.warn(`⚠️ ${modelName} not found (404). Hopping to next model...`);
                    break; 
                }

                // If 429 or 503, RETRY this specific model with backoff
                if ((status === 429 || status === 503) && i < retries - 1) {
                    console.log(`[Traffic] ${modelName} busy, retrying in ${delay}ms...`);
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2;
                    continue;
                }

                // If it's a different error or we're out of retries, break to try next model
                break; 
            }
        }
    }

    throw lastError || new Error("All AI models failed to respond.");
}

export async function runAudit(contractCode) {
    try {
        if (!API_KEY) {
            throw new Error("GEMINI_API_KEY is missing in Environment Variables.");
        }

        return await smartAuditExecution(contractCode);

    } catch (error) {
        console.error("CRITICAL AUDIT FAILURE:", error.message);
        
        let friendlyMessage = "Audit Failed: All AI models are currently unavailable.";
        
        if (error.message?.includes("API key")) {
            friendlyMessage = "Critical: Invalid API Key. Please check your Google AI Studio dashboard.";
        } else if (error.message?.includes("429")) {
            friendlyMessage = "High Traffic: Google's free tier limit reached. Please try again in 1 minute.";
        }

        return {
            success: false,
            error: friendlyMessage,
            details: error.message
        };
    }
}
