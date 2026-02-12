import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

/**
 * Accessing the key from Render Environment Variables.
 * We use .trim() to ensure no accidental spaces from the Render dashboard break the key.
 */
const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim().replace(/['"]+/g, '') : "";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * MODEL HIERARCHY
 * If one model is not found (404) or busy (429), it jumps to the next one automatically.
 */
const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-flash-8b"];

/**
 * Core Execution with Retry & Model-Hopping
 */
async function executeWithRetry(contractCode) {
    let lastError = null;

    for (const modelName of MODELS) {
        let retries = 3;
        let delay = 2000;

        for (let i = 0; i < retries; i++) {
            try {
                console.log(`📡 Sential AI: Attempting ${modelName} (Try ${i + 1})`);
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
                // Strip Markdown code blocks if AI adds them
                const cleanJson = responseText.trim().replace(/```json|```/g, "");
                
                return {
                    success: true,
                    model: modelName,
                    analysis: JSON.parse(cleanJson)
                };

            } catch (error) {
                lastError = error;
                const status = error.status || (error.response ? error.response.status : null);

                // If 404 (Not Found): Skip this model and try the next one in the list
                if (status === 404 || error.message?.includes("404")) {
                    console.warn(`⚠️ Model ${modelName} not available. Trying next...`);
                    break; 
                }

                // If 429/503 (Busy/Limit): Wait and retry this same model
                if ((status === 429 || status === 503 || error.message?.includes("429")) && i < retries - 1) {
                    console.log(`⏳ Traffic high on ${modelName}, retrying in ${delay}ms...`);
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2;
                    continue;
                }

                // Any other error: Move to the next model
                break;
            }
        }
    }
    throw lastError;
}

export async function runAudit(contractCode) {
    try {
        if (!API_KEY) {
            return { success: false, error: "Critical Error: GEMINI_API_KEY is not set on Render." };
        }

        const result = await executeWithRetry(contractCode);
        return result;

    } catch (error) {
        console.error("FINAL ERROR LOG:", error.message);
        
        let userMessage = "Audit Failed: The engine is currently under heavy load.";
        
        /**
         * We use the word 'limit' here so your index.js logic 
         * correctly triggers the 503 status code.
         */
        if (error.message.includes("429") || error.message.toLowerCase().includes("limit") || error.message.toLowerCase().includes("quota")) {
            userMessage = "Audit Failed: AI rate limit reached. Please try again in 30 seconds.";
        } else if (error.message.includes("API key")) {
            userMessage = "Invalid API Key: Please verify the key in your Render dashboard.";
        }

        return {
            success: false,
            error: userMessage,
            debug: error.message
        };
    }
}
