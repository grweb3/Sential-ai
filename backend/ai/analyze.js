import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * PRODUCTION-GRADE RETRY LOGIC
 * This stops the "High Traffic" error by waiting and retrying automatically.
 */
async function retryWithBackoff(fn, retries = 4, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            const status = error.status || (error.response ? error.response.status : null);
            // 429 = Rate Limit, 503 = Overloaded
            if ((status === 429 || status === 503) && i < retries - 1) {
                console.log(`[RETRYING] Traffic high. Waiting ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Wait longer each time
                continue;
            }
            throw error;
        }
    }
}

export async function runAudit(contractCode) {
    try {
        // USE THE STABLE ID: gemini-1.5-flash
        // gemini-2.0-flash-exp is experimental and often causes 404s
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            You are an expert Smart Contract Security Auditor.
            Analyze the following Solidity code and return ONLY a JSON object.
            
            Schema:
            {
              "auditReport": {
                "score": 0-10,
                "summary": "...",
                "critical": [], "high": [], "medium": [], "gas": [], "practices": []
              }
            }

            Code:
            ${contractCode}
        `;

        const responseText = await retryWithBackoff(async () => {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json",
                },
            });
            return result.response.text();
        });

        return {
            success: true,
            analysis: JSON.parse(responseText.trim())
        };

    } catch (error) {
        console.error("ANALYSIS FAILED:", error.message);
        let errorMsg = "Audit Failed. Please try again in 30 seconds.";
        
        if (error.message.includes("404")) {
            errorMsg = "Critical: Model not found. Check if your API Key is valid.";
        }
        
        return { success: false, error: errorMsg };
    }
}
