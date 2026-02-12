import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// Clean the key
const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim().replace(/['"]+/g, '') : "";
const genAI = new GoogleGenerativeAI(API_KEY);

const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-flash-8b"];

async function executeWithRetry(contractCode) {
    let lastError = null;

    for (const modelName of MODELS) {
        let retries = 2; // 2 tries per model
        let delay = 2000;

        for (let i = 0; i < retries; i++) {
            try {
                console.log(`Trying ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: `Analyze this Solidity code and return JSON: ${contractCode}` }] }],
                    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
                });

                const responseText = result.response.text();
                return {
                    success: true,
                    model: modelName,
                    analysis: JSON.parse(responseText.trim().replace(/```json|```/g, ""))
                };

            } catch (error) {
                lastError = error;
                // LOG THE REAL ERROR TO RENDER CONSOLE
                console.error(`❌ ${modelName} Error [${error.status || 'No Status'}]: ${error.message}`);

                // If the key is actually invalid (403/401), stop immediately
                if (error.message.includes("API_KEY_INVALID") || error.message.includes("403")) {
                    throw new Error("API_KEY_INVALID");
                }
                
                // If 404, hop to next model
                if (error.message.includes("404")) break;

                // If 429, wait and retry
                if (error.message.includes("429") && i < retries - 1) {
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
        if (!API_KEY) return { success: false, error: "GEMINI_API_KEY missing on Render." };

        return await executeWithRetry(contractCode);

    } catch (error) {
        let userMessage = "The engine is currently under heavy load.";
        
        // Specific checks
        if (error.message === "API_KEY_INVALID") {
            userMessage = "Critical: Your Gemini API Key is invalid or restricted.";
        } else if (error.message.includes("429") || error.message.includes("limit")) {
            userMessage = "Audit Failed: AI rate limit reached. Please wait 60 seconds.";
        }

        return {
            success: false,
            error: userMessage,
            technicalDetails: error.message // This helps us see the real error on the frontend
        };
    }
}
