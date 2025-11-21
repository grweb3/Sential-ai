// backend/test_gemini.js
import dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("🔑 API Key exists:", !!process.env.GEMINI_API_KEY);
console.log("🔑 API Key (first 10 chars):", process.env.GEMINI_API_KEY?.substring(0, 10) + "...");

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // List of models to try (in order of likelihood)
    const modelsToTry = [
      "gemini-1.5-flash",
      "gemini-1.5-pro", 
      "gemini-pro",
      "gemini-2.0-flash-exp"
    ];

    console.log("\n🧪 Testing Gemini models...\n");

    for (const modelName of modelsToTry) {
      console.log(`\n--- Testing: ${modelName} ---`);
      
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent("Say 'Hello, I am working!' in one sentence.");
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${modelName} WORKS!`);
        console.log(`Response: ${text}`);
        console.log(`\n🎉 USE THIS MODEL: "${modelName}"`);
        
        return modelName; // Return first working model
        
      } catch (error) {
        console.log(`❌ ${modelName} failed:`, error.message);
      }
    }
    
    console.log("\n❌ None of the models worked. Check your API key.");
    
  } catch (error) {
    console.error("\n💥 Fatal Error:", error.message);
    console.error("\nPossible issues:");
    console.error("1. Invalid API key");
    console.error("2. API key not set in .env file");
    console.error("3. Network/firewall blocking Google AI API");
    console.error("\n📝 Get your API key at: https://aistudio.google.com/app/apikey");
  }
}

testGemini();