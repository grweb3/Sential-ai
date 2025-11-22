import { GoogleGenerativeAI } from "@google/generative-ai";

// Priority order: Mix of Newest (Experimental) and Stable models
const MODEL_PRIORITY = [
  { name: "gemini-2.0-flash-exp", quota: "Experimental (High Rate Limit)" },
  { name: "gemini-1.5-flash", quota: "Fast & Stable" },
  { name: "gemini-1.5-pro", quota: "High Intelligence" },
];

// Helper to strip markdown formatting (```json ... ```) from AI response
function cleanAndParseJSON(text) {
  try {
    // 1. Try direct parse first
    return JSON.parse(text);
  } catch (e) {
    // 2. If failed, strip markdown code fences
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
      return JSON.parse(clean);
    } catch (e2) {
      console.error("JSON Parse Failed. Raw text:", text.substring(0, 100) + "...");
      throw new Error("AI returned invalid JSON format");
    }
  }
}

async function tryModelWithFallback(genAI, prompt, attemptedModels = []) {
  for (const modelInfo of MODEL_PRIORITY) {
    // Skip models we already failed on
    if (attemptedModels.includes(modelInfo.name)) continue;

    try {
      console.log(`🤖 Trying model: ${modelInfo.name}`);
      const model = genAI.getGenerativeModel({ 
        model: modelInfo.name,
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) throw new Error("Empty response from AI");

      // Use the robust parser
      const jsonResponse = cleanAndParseJSON(text);

      console.log(`✅ Success with ${modelInfo.name}`);
      return {
        success: true,
        analysis: jsonResponse,
        modelUsed: modelInfo.name,
      };

    } catch (error) {
      console.log(`⚠️ ${modelInfo.name} failed: ${error.message}`);
      attemptedModels.push(modelInfo.name);
      
      // If it's a rate limit (429), wait 1 second before trying next model
      if (error.message.includes("429")) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // If we get here, all models failed
  return {
    success: false,
    error: "High traffic. All AI models are currently busy. Please try again in 10 seconds.",
  };
}

export async function runAudit(code) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { success: false, error: "Server Error: API Key missing" };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const prompt = `
    You are an elite Smart Contract Auditor. Analyze the following Solidity code.
    
    Your Task:
    1. Identitfy Critical, High, and Medium severity vulnerabilities.
    2. Suggest Gas Optimizations.
    3. Evaluate Security Best Practices.
    4. Assign a security score (0-10).
    5. Write a brief executive summary.

    RETURN ONLY A RAW JSON OBJECT. NO MARKDOWN.
    
    JSON Structure:
    {
      "auditReport": {
        "critical": [ {"title": "Issue Title", "description": "Brief explanation", "recommendation": "How to fix"} ],
        "high": [ {"title": "Issue Title", "description": "Brief explanation", "recommendation": "How to fix"} ],
        "medium": [ {"title": "Issue Title", "description": "Brief explanation", "recommendation": "How to fix"} ],
        "gas": [ {"title": "Optimization", "description": "How to save gas", "recommendation": "Code suggestion"} ],
        "practices": [ {"title": "Good Practice", "description": "What is done well", "recommendation": "Keep it up"} ],
        "summary": "A 2-sentence executive summary of the contract's security status.",
        "score": 8.5
      }
    }

    Contract Code:
    ${code}
    `;

    return await tryModelWithFallback(genAI, prompt);

  } catch (err) {
    console.error("Audit Error:", err);
    return { success: false, error: "Internal Audit Error: " + err.message };
  }
}
