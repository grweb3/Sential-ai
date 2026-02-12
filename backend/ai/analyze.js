import dotenv from "dotenv";
dotenv.config();

// Clean the key
const API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim().replace(/['"]+/g, '') : "";

export async function runAudit(contractCode) {
    try {
        if (!API_KEY) return { success: false, error: "API Key missing in Render settings." };

        console.log("📡 Sending RAW fetch request to Google Gemini (US Region check)...");

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
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
            
            if (data.error?.message?.includes("location")) {
                return { success: false, error: "GEOGRAPHIC BLOCK: Google Gemini is not available in your Render server's region. Change Render Region to Oregon (US West)." };
            }
            
            throw new Error(data.error?.message || "Google API Rejected Request");
        }

        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        // Extract JSON
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}') + 1;
        const cleanJson = responseText.substring(jsonStart, jsonEnd);

        return {
            success: true,
            analysis: JSON.parse(cleanJson)
        };

    } catch (error) {
        console.error("FINAL ERROR LOG:", error.message);
        return {
            success: false,
            error: error.message.includes("fetch") ? "Connection Error" : error.message
        };
    }
}
