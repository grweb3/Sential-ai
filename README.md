<div align="center">
<!-- Replace with your actual logo URL if hosted, or relative path -->
<img src="frontend/logo.png" alt="Sential AI Logo" width="120" height="120" />

<p>
<strong>The Essential Guardian for Smart Contract Code.</strong>
</p>

<p>
<a href="https://sential-ai.onrender.com">Live Demo</a> •
<a href="#-installation">Installation</a> •
<a href="#-api-reference">API Docs</a> •
<a href="#-features">Features</a>
</p>

<p>
<img src="https://img.shields.io/badge/status-active-success.svg" alt="Status" />
<img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
<img src="https://img.shields.io/badge/node-%253E%253D%252018.0.0-brightgreen" alt="Node Version" />
</p>
</div>

>

🟣 Overview

Sential AI (v1.0) is an intelligent "pre-flight check" tool designed for Web3 developers. Developed by BlockVIA, this tool leverages advanced LLMs (Google Gemini 1.5 Pro) to perform instant, automated security audits on Solidity smart contracts.

This version is completely free and open source. We believe basic security tooling should be accessible to every developer building the decentralized future.

🚀 Why Sential v1.0?

Security shouldn't be a luxury. We built Sential v1.0 to be the standard "Pre-Flight Check" for the Web3 ecosystem.

Core Philosophy

Impact

🛡️ Democratizing Trust

We believe basic security tooling should be free and accessible to every builder, from hackathon devs to founders.

⚡ Instant Feedback

Waiting weeks for an audit kills momentum. Sential gives you answers in seconds.

🧠 Logic over Syntax

Unlike basic linters, Sential analyzes the intent of your code to find logical flaws.

📚 Developer Growth

We don't just find bugs; every report explains why they happen so you become a better Solidity developer.
🔮 Future Roadmap (v2.0)

While Sential v1.0 provides essential protection for individual developers, BlockVIA is currently engineering the next evolution of blockchain security.

Sential Pro (v2.0) is currently in development. It will be a comprehensive, enterprise-grade platform designed for protocols and institutions.

Feature

Sential v1.0 (Current)

Sential Pro (Upcoming)

Access

Free & Open Source

Paid / Subscription

Engine

Gemini 1.5 Pro

Multi-Model Ensemble (Claude + GPT-4 + Llama 3)

Analysis

Single Contract

Full Repo & Dependency Analysis

Context

1 Million Tokens

Infinite Context (RAG Architecture)

Tools

Static Analysis

Symbolic Execution + Formal Verification

Sential v1.0 will remain free forever. The upcoming v2.0 will set a new standard for automated auditing.

✨ Features (v1.0)

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

git clone [https://github.com/grweb3/Sential-ai.git](https://github.com/grweb3/Sential-ai.git)
cd sential-ai


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
  "analysis": {
    "auditReport": {
      "score": 8.5,
      "critical": [],
      "high": []
    }
  }
}


🛡️ Security Architecture

Smart Model Fallback

Sential implements a robust fallback system in backend/ai/analyze.js. If the primary model is overloaded or rate-limited, it automatically retries with the next available model in this order:

gemini-2.0-flash-exp (Experimental / High Speed)

gemini-1.5-flash (Stable)

gemini-1.5-pro (High Intelligence)

API Key Protection

API keys are stored strictly in server-side environment variables.

The frontend never sees the API key.

Rate limiting is handled via the backend.

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
<p>Built with ❤️ by <a href="https://blockvia.xyz">BlockVIA</a></p>
<p><em>"Redefining trust in blockchain."</em></p>
</div>
