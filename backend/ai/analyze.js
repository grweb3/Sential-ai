import { GoogleGenerativeAI } from "@google/generative-ai";

// Priority order: Most powerful models first
const MODEL_PRIORITY = [
  { name: "gemini-2.5-pro", quota: "150 req/min, 2M tokens" },
  { name: "gemini-2.5-flash", quota: "1K req/min, 1M tokens" },
  { name: "gemini-2.0-flash", quota: "2K req/min, 4M tokens" },
  { name: "gemini-2.0-flash-exp", quota: "10 req/min, 250K tokens" },
];

async function tryModelWithFallback(genAI, prompt, attemptedModels = []) {
  for (const modelInfo of MODEL_PRIORITY) {
    // Skip already attempted models
    if (attemptedModels.includes(modelInfo.name)) {
      continue;
    }

    try {
      console.log(`🤖 Trying model: ${modelInfo.name}`);
      const model = genAI.getGenerativeModel({ model: modelInfo.name });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        console.log(`⚠️ ${modelInfo.name} returned empty response, trying next model...`);
        continue;
      }

      console.log(`✅ Success with ${modelInfo.name} (${text.length} chars)`);
      return {
        success: true,
        analysis: text,
        modelUsed: modelInfo.name,
      };

    } catch (error) {
      const errorMsg = error.message || "";
      
      // Check if it's a quota/rate limit error
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("rate limit")) {
        console.log(`⏱️ ${modelInfo.name} quota exceeded, trying next model...`);
        attemptedModels.push(modelInfo.name);
        continue; // Try next model
      }
      
      // Check if model not found
      if (errorMsg.includes("404") || errorMsg.includes("not found")) {
        console.log(`❌ ${modelInfo.name} not available, trying next model...`);
        attemptedModels.push(modelInfo.name);
        continue;
      }

      // Other errors - try next model
      console.log(`⚠️ ${modelInfo.name} error: ${errorMsg.substring(0, 100)}...`);
      attemptedModels.push(modelInfo.name);
      continue;
    }
  }

  // All models failed
  return {
    success: false,
    error: `All models exhausted. Attempted: ${attemptedModels.join(", ")}. Please wait 1 minute or enable billing.`,
    attemptedModels,
  };
}

export async function runAudit(code) {
  try {
    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY not found");
      return {
        success: false,
        error: "API key not configured. Check your .env file",
      };
    }

    console.log("✅ Initializing Gemini AI with smart fallback...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const prompt = `
You are an expert Solidity smart contract security auditor with deep knowledge of:
- Common vulnerabilities (reentrancy, overflow/underflow, access control, etc.)
- Gas optimization techniques
- Best practices and design patterns
- DeFi-specific security concerns

Analyze this smart contract thoroughly:

\`\`\`solidity
${code}
\`\`\`

Provide a comprehensive security audit with:

## 🔴 CRITICAL VULNERABILITIES
List any critical security issues that could lead to loss of funds or contract takeover.
For each: Severity, Location, Explanation, Exploit Scenario, Fix

## 🟠 HIGH SEVERITY ISSUES
List high-priority issues that should be addressed before deployment.
For each: Severity, Location, Explanation, Fix

## 🟡 MEDIUM/LOW SEVERITY ISSUES
List medium and low priority concerns.
For each: Severity, Location, Explanation, Recommendation

## 💰 GAS OPTIMIZATION OPPORTUNITIES
Suggest specific optimizations to reduce gas costs.

## ✅ SECURITY BEST PRACTICES
Note what the contract does well and any additional recommendations.

## 📊 OVERALL ASSESSMENT
Provide a security score (1-10) and final recommendation (Deploy / Fix Critical Issues / Major Refactor Needed).

Be specific, reference line numbers if possible, and provide code examples for fixes.
    `;

    console.log("📝 Starting smart contract analysis...");
    const result = await tryModelWithFallback(genAI, prompt);

    if (!result.success) {
      console.error("❌ All models failed");
      return result;
    }

    console.log(`✅ Analysis complete using ${result.modelUsed}`);
    return result;

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return {
      success: false,
      error: err.message || "Unexpected audit failure",
    };
  }
}