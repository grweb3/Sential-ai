import dotenv from "dotenv";
dotenv.config();

// Clean the key
const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim().replace(/['"]+/g, '') : "";

export async function runAudit(contractCode) {
    try {
        if (!API_KEY) return { success: false, error: "API Key missing in Render settings." };

        console.log("📡 Sending RAW fetch request to Google Gemini (Stable v1 check)...");

        /**
         * SWITCHED TO v1 ENDPOINT
         * The 404 error was caused by gemini-1.5-flash not being found in the v1beta endpoint.
         * Using the stable v1 endpoint is the reliable method for this model.
         */
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Analyze this Solidity code and return ONLY a structured JSON report. 
                            Structure: { "auditReport": { "score": 0, "summary": "", "critical": [], "high": [], "medium": [], "gas": [], "practices": [] } } 
                            Code: ${contractCode}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ Google API Error Detail:", JSON.stringify(data));
            
            // Handle regional restrictions
            if (data.error?.message?.toLowerCase().includes("location") || data.error?.status === "PERMISSION_DENIED") {
                return { 
                    success: false, 
                    error: "GEOGRAPHIC BLOCK: Google Gemini is not available in your server's current region. Please change Render Region to Oregon (US West) or Ohio (US East)." 
                };
            }
            
            throw new Error(data.error?.message || "Google API Rejected Request");
        }

        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!responseText) {
            throw new Error("AI returned an empty response.");
        }

        // Extract JSON using robust bracket matching
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd <= jsonStart) {
            throw new Error("AI failed to return valid JSON format.");
        }

        const cleanJson = responseText.substring(jsonStart, jsonEnd);

        return {
            success: true,
            analysis: JSON.parse(cleanJson)
        };

    } catch (error) {
        console.error("FINAL ERROR LOG:", error.message);
        
        let errorMessage = error.message;
        if (error.message.includes("fetch")) {
            errorMessage = "Network Connection Error. Check Render internet connectivity.";
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}
