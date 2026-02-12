import dotenv from "dotenv";
dotenv.config();

// Clean the key
const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim().replace(/['"]+/g, '') : "";

/**
 * We try two different endpoints because some keys/regions 
 * behave differently with v1 vs v1beta.
 */
const ENDPOINTS = [
    "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
];

async function callGemini(contractCode) {
    let lastError = null;

    for (const url of ENDPOINTS) {
        try {
            console.log(`📡 Trying endpoint: ${url}`);
            
            const response = await fetch(`${url}?key=${API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Analyze this Solidity smart contract. Output ONLY a valid JSON object. 
                            Structure: { "auditReport": { "score": 0, "summary": "", "critical": [], "high": [], "medium": [], "gas": [], "practices": [] } } 
                            Code: ${contractCode}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1
                        // Note: responseMimeType is removed to prevent 400 errors on stable v1
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error(`❌ Endpoint failed [${response.status}]:`, data.error?.message);
                lastError = data.error?.message || "Unknown API Error";
                continue; // Try the next endpoint
            }

            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!responseText) throw new Error("AI returned an empty response.");

            // Extract JSON from potential markdown wrapping
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}') + 1;
            const cleanJson = responseText.substring(jsonStart, jsonEnd);

            return JSON.parse(cleanJson);

        } catch (err) {
            lastError = err.message;
            console.error("Fetch Loop Error:", err.message);
        }
    }
    throw new Error(lastError);
}

export async function runAudit(contractCode) {
    try {
        if (!API_KEY) return { success: false, error: "API Key missing in Render settings." };

        const analysis = await callGemini(contractCode);

        return {
            success: true,
            analysis: analysis
        };

    } catch (error) {
        console.error("FINAL ERROR LOG:", error.message);
        
        let userMessage = error.message;
        if (error.message.includes("429")) userMessage = "Rate limit reached. Wait 60s.";
        if (error.message.includes("403")) userMessage = "API Key invalid or Permission Denied.";
        
        return {
            success: false,
            error: userMessage
        };
    }
}
