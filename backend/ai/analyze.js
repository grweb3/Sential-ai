import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// 1. CLEAN THE API KEY
// Removes any accidental spaces or quotes from Render/GitHub secrets
const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim().replace(/['"]+/g, '') : "";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * MODEL HIERARCHY
 * If the primary model fails or isn't available in your region, it hops to the next.
 */
const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-flash-8b"];

/**
 * SMART EXECUTION ENGINE
 * Handles retries for traffic (429) and model-hopping for 404s.
 */
async function executeWithRetry(contractCode) {
    let lastError = null;

    for (const modelName of MODELS) {
        let retries = 3;
        let delay = 2000;

        for (let i = 0; i < retries; i++) {
            try {
                console.log(`🤖 Audit Attempt: ${modelName} (Try ${i + 1})`);
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
                // Strip any markdown the AI might have added
                const cleanJson = responseText.trim().replace(/```json|```/g, "");
                
                return {
                    success: true,
                    model: modelName,
                    analysis: JSON.parse(cleanJson)
                };

            } catch (error) {
                lastError = error;
                const status = error.status || (error.response ? error.response.status : null);

                // IF 404: The model doesn't exist for your key/region. SKIP to next model.
                if (status === 404 || error.message?.includes("404")) {
                    console.warn(`⚠️ ${modelName} 404 Not Found. Skipping...`);
                    break; 
                }

                // IF 429/503: Busy. WAIT and try again.
                if ((status === 429 || status === 503) && i < retries - 1) {
                    console.log(`[Traffic] ${modelName} busy, waiting ${delay}ms...`);
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2;
                    continue;
                }

                // Any other error: try the next model
                break;
            }
        }
    }
    throw lastError;
}

export async function runAudit(contractCode) {
    try {
        if (!API_KEY) {
            return { success: false, error: "GEMINI_API_KEY is missing. Check your environment variables." };
        }

        const result = await executeWithRetry(contractCode);
        return result;

    } catch (error) {
        console.error("FINAL AUDIT ERROR:", error.message);
        
        let userMessage = "Audit Failed: The AI engine is currently over capacity.";
        
        if (error.message.includes("API key")) {
            userMessage = "Invalid API Key. Please generate a new one in Google AI Studio.";
        }

        return {
            success: false,
            error: userMessage,
            debug: error.message
        };
    }
}
