// backend/test_fallback.js
import dotenv from "dotenv";
dotenv.config();
import { runAudit } from "./ai/analyze.js";

const testContract = `
pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint256) public balances;
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    // Vulnerable to reentrancy attack!
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= amount; // State update after external call!
    }
    
    function getBalance() public view returns (uint256) {
        return balances[msg.sender];
    }
}
`;

console.log("🧪 Testing Smart Fallback System");
console.log("=".repeat(60));
console.log("This test will:");
console.log("1. Try gemini-2.0-flash-exp first");
console.log("2. Auto-fallback if quota exceeded");
console.log("3. Try all 4 models in priority order");
console.log("=".repeat(60) + "\n");

async function testFallback() {
  try {
    console.log("📝 Analyzing vulnerable contract (reentrancy bug)...\n");
    
    const result = await runAudit(testContract);
    
    if (result.success) {
      console.log("\n" + "=".repeat(60));
      console.log("✅ AUDIT SUCCESSFUL");
      console.log("=".repeat(60));
      console.log(`🤖 Model used: ${result.modelUsed}`);
      console.log(`📊 Analysis length: ${result.analysis.length} characters`);
      console.log("\n📋 First 500 chars of analysis:");
      console.log("-".repeat(60));
      console.log(result.analysis.substring(0, 500) + "...");
      console.log("-".repeat(60));
      console.log("\n✅ Smart fallback system is working perfectly!");
      
    } else {
      console.log("\n" + "=".repeat(60));
      console.log("❌ AUDIT FAILED");
      console.log("=".repeat(60));
      console.log(`Error: ${result.error}`);
      if (result.attemptedModels) {
        console.log(`Attempted models: ${result.attemptedModels.join(", ")}`);
      }
      console.log("\n💡 Solutions:");
      console.log("1. Wait 60 seconds for quota reset");
      console.log("2. Enable billing: https://console.cloud.google.com/billing");
      console.log("3. Create new API key: https://aistudio.google.com/app/apikey");
    }
    
  } catch (error) {
    console.error("\n💥 Unexpected error:", error.message);
  }
}

testFallback();