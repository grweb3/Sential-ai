// backend/list_models.js
import dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("Using GEMINI key:", !!process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = await client.listModels();
    console.log("==== Available models ====");
    // print compact list
    models.forEach((m) => {
      console.log(m.name);
      if (m.supportedMethods) console.log("  methods:", m.supportedMethods.join(", "));
    });
    console.log("==== full model objects ====");
    console.log(JSON.stringify(models, null, 2));
  } catch (err) {
    console.error("ListModels error:", err.response?.data || err.message || err);
  }
}

listModels();
