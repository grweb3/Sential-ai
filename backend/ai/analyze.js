import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// Clean the key
const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim().replace(/['"]+/g, '') : "";

/**
 * We initialize the SDK. 
 * Removed responseMimeType from config as it was causing 400 Bad Request on certain v1 endpoints.
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
                
                // Using v1 API version
                const model = genAI.getGenerativeModel(
                    { model: modelName },
                    { apiVersion: 'v1' } 
                );

                const prompt = `Analyze this Solidity code and return ONLY a structured JSON report. 
                Do not include any conversational text, only the JSON object.
                
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

                Code: 
                ${contractCode}`;

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { 
                        temperature: 0.1,
                        // responseMimeType removed to fix 400 Bad Request error
                    },
                });

                const responseText = result.response.text();
                
                /**
                 * Robust JSON Extraction
                 * Since we removed responseMimeType, the AI might wrap the response in markdown.
                 * We find the first '{' and last '}' to extract the raw JSON.
                 */
                const jsonStart = responseText.indexOf('{');
                const jsonEnd = responseText.lastIndexOf('}') + 1;
                
                if (jsonStart === -1 || jsonEnd === 0) {
                    throw new Error("AI failed to return a valid JSON structure.");
                }

                const cleanJson = responseText.substring(jsonStart, jsonEnd);
                
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
        
        let userMessage = error.message;

        if (error.message.includes("AUTH_ERROR")) {
            userMessage = "Invalid API Key. Check your Render Environment Variables.";
        } else if (error.message.includes("429")) {
            userMessage = "AI Rate Limit Reached. Please wait 60 seconds.";
        } else if (error.message.includes("404")) {
            userMessage = "Google Gemini is having trouble finding the model. Trying to reconnect...";
        } else if (error.message.includes("400")) {
            userMessage = "The audit engine encountered a request error. Retrying with a different configuration...";
        }

        return {
            success: false,
            error: userMessage,
            technical: error.message
        };
    }
}
