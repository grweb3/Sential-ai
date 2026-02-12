import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// Clean the key
const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim().replace(/['"]+/g, '') : "";

/**
 * We initialize the SDK but we will also use a fallback 
 * to ensure the 'v1' endpoint is reached if the SDK defaults to 'v1beta'.
 */
const genAI = new GoogleGenerativeAI(API_KEY);

const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"];

async function executeWithRetry(contractCode) {
    let lastError = null;

    for (const modelName of MODELS) {
        let retries = 2; 
        let delay = 2000;

        for (let i = 0; i < retries; i++) {
            try {
                console.log(`📡 Connecting to ${modelName} via Stable v1 API...`);
                
                // FORCE v1 API VERSION
                const model = genAI.getGenerativeModel(
                    { model: modelName },
                    { apiVersion: 'v1' } 
                );

                const prompt = `Analyze this Solidity code and return ONLY a structured JSON report. \n\n Code: ${contractCode}`;

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { 
                        temperature: 0.1, 
                        responseMimeType: "application/json" 
                    },
                });

                const responseText = result.response.text();
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

                // If the key is blocked or invalid
                if (statusCode === 403 || statusCode === 401 || error.message.includes("API_KEY_INVALID")) {
                    throw new Error("AUTH_ERROR: Your API Key is invalid or blocked in this region.");
                }
                
                // If 404, the model identifier or API version is wrong for your account
                if (statusCode === 404) {
                    console.warn(`⏭️ ${modelName} not found on v1. Trying next...`);
                    break; 
                }

                // If 429 (Rate Limit)
                if (statusCode === 429 && i < retries - 1) {
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2;
                    continue;
                }
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

        const result = await executeWithRetry(contractCode);
        return result;

    } catch (error) {
        console.error("FINAL ERROR LOG:", error.message);
        
        // We are now passing the EXACT error back to you
        let userMessage = error.message;

        if (error.message.includes("AUTH_ERROR")) {
            userMessage = "Invalid API Key. Check your Render Environment Variables.";
        } else if (error.message.includes("429")) {
            userMessage = "AI Rate Limit Reached. Please wait 60 seconds.";
        } else if (error.message.includes("404")) {
            userMessage = "Google Gemini is having trouble finding the model. Trying to reconnect...";
        }

        return {
            success: false,
            error: userMessage,
            technical: error.message
        };
    }
}
