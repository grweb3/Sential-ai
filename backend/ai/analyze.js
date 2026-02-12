import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// Clean the key
const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim().replace(/['"]+/g, '') : "";

/**
 * We are explicitly setting the API version to 'v1' instead of the default 'v1beta'.
 * This fixes the 404 errors on Render where certain models aren't found in the beta endpoint.
 */
const genAI = new GoogleGenerativeAI(API_KEY);

// We use the most reliable stable names
const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

async function executeWithRetry(contractCode) {
    let lastError = null;

    for (const modelName of MODELS) {
        let retries = 2; 
        let delay = 2000;

        for (let i = 0; i < retries; i++) {
            try {
                console.log(`📡 Attempting connection: ${modelName} (v1)...`);
                
                // Explicitly request the model. 
                // Note: The SDK handles the 'models/' prefix automatically.
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1' });

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: `Analyze this Solidity code and return ONLY a structured JSON report. \n\n Code: ${contractCode}` }] }],
                    generationConfig: { 
                        temperature: 0.1, 
                        responseMimeType: "application/json" 
                    },
                });

                const responseText = result.response.text();
                
                // Robust parsing to handle potential AI formatting issues
                const cleanJson = responseText.trim().replace(/```json|```/g, "");
                
                return {
                    success: true,
                    model: modelName,
                    analysis: JSON.parse(cleanJson)
                };

            } catch (error) {
                lastError = error;
                const statusCode = error.status || 0;
                
                console.error(`❌ ${modelName} Failure: [${statusCode}] ${error.message}`);

                // 1. If Invalid Key, stop immediately
                if (error.message.includes("API_KEY_INVALID") || statusCode === 403 || statusCode === 401) {
                    throw new Error("API_KEY_INVALID");
                }
                
                // 2. If 404, the model is not in this endpoint/region. Try next model.
                if (statusCode === 404 || error.message.includes("404")) {
                    console.warn(`⏭️ ${modelName} not found. Trying alternative...`);
                    break; 
                }

                // 3. If 429 (Rate Limit), wait and retry this specific model
                if ((statusCode === 429 || error.message.includes("429")) && i < retries - 1) {
                    console.log(`⏳ Rate limit hit. Waiting ${delay}ms...`);
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2;
                    continue;
                }

                // For any other error, move to the next model in the list
                break; 
            }
        }
    }
    throw lastError;
}

export async function runAudit(contractCode) {
    try {
        if (!API_KEY) {
            return { success: false, error: "GEMINI_API_KEY is missing in Render Environment Variables." };
        }

        return await executeWithRetry(contractCode);

    } catch (error) {
        console.error("FINAL ERROR LOG:", error.message);
        
        let userMessage = "The engine is currently under heavy load.";
        
        if (error.message === "API_KEY_INVALID") {
            userMessage = "Critical: Your Gemini API Key is invalid, restricted, or expired.";
        } else if (error.message.includes("429") || error.message.includes("limit")) {
            userMessage = "Audit Failed: AI rate limit reached. Please wait 60 seconds.";
        } else if (error.message.includes("404")) {
            userMessage = "Audit Failed: No compatible AI models found for your region/key.";
        }

        return {
            success: false,
            error: userMessage,
            technicalDetails: error.message
        };
    }
}
