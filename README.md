<div align="center">
<!-- Replace with your actual logo URL if hosted, or relative path -->
<img src="frontend/logo.png" alt="Sential AI Logo" width="120" height="120" />

<h1>SENTIAL AI</h1>

<p>
<strong>The Essential Guardian for Smart Contract Code.</strong>
</p>

<p>
<a href="https://www.google.com/search?q=https://sential-ai.onrender.com">Live Demo</a> •
<a href="#-installation">Installation</a> •
<a href="#-api-reference">API Docs</a> •
<a href="#-features">Features</a>
</p>

<p>
<img src="https://www.google.com/search?q=https://img.shields.io/badge/status-active-success.svg" alt="Status" />
<img src="https://www.google.com/search?q=https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
<img src="https://www.google.com/search?q=https://img.shields.io/badge/node-%253E%253D%252018.0.0-brightgreen" alt="Node Version" />
</p>
</div>

🟣 Overview

Sential AI is an intelligent "pre-flight check" tool for Web3 developers. It leverages advanced LLMs (Google Gemini 1.5 Pro) to perform instant, automated security audits on Solidity smart contracts.

Before sending code to a human auditor or deploying to mainnet, Sential provides a comprehensive analysis covering critical vulnerabilities, gas optimizations, and code quality standards.

🚀 Why Sential?

Speed: Get a full audit report in under 10 seconds.

Cost: 100% Free (Powered by Gemini Free Tier).

Depth: Analyzes logic, not just syntax.

Education: Explains why a vulnerability is dangerous and how to fix it.

✨ Features

Feature

Description

🔴 Critical Detection

Identifies reentrancy, overflow/underflow, and access control exploits.

💰 Gas Optimization

Suggests code changes to reduce deployment and execution costs.

📝 Auto-Documentation

Checks for and generates NatSpec comments for better readability.

📊 Security Score

Assigns a 0-10 score based on code quality and risk factors.

🤖 Smart Fallback

Automatically switches between AI models (Pro → Flash) to ensure uptime.

🛠️ Tech Stack

Frontend: Vanilla JS, HTML5, Tailwind CSS (CDN).

Backend: Node.js, Express.

AI Engine: Google Gemini 1.5 Pro & Flash.

Deployment: Render (Web Service).

Formatting: Marked.js (Markdown parsing).

⚡ Installation (Local)

Follow these steps to run Sential AI on your local machine.

1. Clone the Repository

git clone [https://github.com/YOUR_USERNAME/blockvia-sential.git](https://github.com/YOUR_USERNAME/blockvia-sential.git)
cd blockvia-sential


2. Install Dependencies

Sential runs as a monorepo structure. Install dependencies in the backend folder.

npm install


3. Configure Environment

Create a .env file in the root directory:

touch .env


Add your API keys (Get one from Google AI Studio):

PORT=5000
GEMINI_API_KEY=your_actual_google_api_key_here


4. Run the Server

npm start


The server will start at http://localhost:5000.
Open your browser and navigate to that URL to verify.

📖 API Reference

Sential exposes a single, powerful endpoint for analysis.

POST /api/analyze

Analyzes a provided smart contract string.

Request Body:

{
  "contractCode": "pragma solidity ^0.8.0; contract Example { ... }"
}


Response:

{
  "success": true,
  "modelUsed": "gemini-1.5-pro",
  "analysis": "## CRITICAL VULNERABILITIES\n\nNone found..."
}


🛡️ Security Architecture

Smart Model Fallback

Sential implements a robust fallback system in backend/ai/analyze.js. If the primary model is overloaded or rate-limited, it automatically retries with the next available model in this order:

gemini-1.5-pro (Highest Intelligence)

gemini-1.5-flash (Fastest Response)

gemini-pro (Legacy Fallback)

API Key Protection

API keys are stored strictly in server-side environment variables.

The frontend never sees the API key.

Rate limiting is handled via the backend.

📂 Project Structure

blockvia-sential/
├── backend/
│   ├── ai/
│   │   └── analyze.js       # AI Integration Logic
│   ├── index.js             # Main Server Entry Point
│   └── node_modules/
├── frontend/
│   ├── index.html           # Main UI (Tailwind + JS)
│   ├── logo.png             # Branding Assets
│   └── hero-bg.mp4          # Background Video
├── .env                     # Secrets (Not committed)
├── .gitignore               # Git Exclusion Rules
├── package.json             # Dependencies
└── README.md                # Documentation


🤝 Contributing

We welcome contributions! Please follow these steps:

Fork the project.

Create your feature branch (git checkout -b feature/AmazingFeature).

Commit your changes (git commit -m 'Add some AmazingFeature').

Push to the branch (git push origin feature/AmazingFeature).

Open a Pull Request.

📄 License

Distributed under the MIT License. See LICENSE for more information.

<div align="center">
<p>Built with ❤️ by <a href="https://www.google.com/search?q=https://blockvia.com">BlockVIA</a></p>
<p><em>"Redefining trust in blockchain."</em></p>
</div>
