import { GoogleGenerativeAI } from "@google/generative-ai";

// Priority order: Most powerful models first
const MODEL_PRIORITY = [
  { name: "gemini-1.5-pro", quota: "High Intelligence" },
  { name: "gemini-1.5-flash", quota: "High Speed" },
];

async function tryModelWithFallback(genAI, prompt, attemptedModels = []) {
  for (const modelInfo of MODEL_PRIORITY) {
    if (attemptedModels.includes(modelInfo.name)) continue;

    try {
      console.log(`🤖 Trying model: ${modelInfo.name}`);
      const model = genAI.getGenerativeModel({ 
        model: modelInfo.name,
        generationConfig: { responseMimeType: "application/json" } // FORCE JSON
      });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) throw new Error("Empty response");

      // Validate JSON parsing
      const jsonResponse = JSON.parse(text);

      console.log(`✅ Success with ${modelInfo.name}`);
      return {
        success: true,
        analysis: jsonResponse, // Return Object, not String
        modelUsed: modelInfo.name,
      };

    } catch (error) {
      console.log(`⚠️ ${modelInfo.name} failed: ${error.message}`);
      attemptedModels.push(modelInfo.name);
    }
  }

  return {
    success: false,
    error: "All AI models are busy or failing. Please try again in 1 minute.",
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
    
    RETURN ONLY A RAW JSON OBJECT. NO MARKDOWN. NO TEXT OUTSIDE JSON.
    
    JSON Structure:
    {
      "auditReport": {
        "critical": [ {"title": "Issue Title", "description": "Explanation", "recommendation": "Fix"} ],
        "high": [ {"title": "Issue Title", "description": "Explanation", "recommendation": "Fix"} ],
        "medium": [ {"title": "Issue Title", "description": "Explanation", "recommendation": "Fix"} ],
        "gas": [ {"title": "Optimization", "description": "How to save gas"} ],
        "practices": [ {"title": "Good Practice", "description": "What is done well"} ],
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
    return { success: false, error: "Internal Audit Error" };
  }
}
