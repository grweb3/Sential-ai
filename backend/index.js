app.post("/api/analyze", async (req, res) => {
  try {
    const { contractCode } = req.body;
    if (!contractCode) return res.status(400).json({ success: false, error: "No code provided" });

    const result = await runAudit(contractCode);
    
    // If it's a rate limit error, send 503 so frontend knows to wait
    if (!result.success && result.error.includes("limit")) {
        return res.status(503).json(result);
    }
    
    if (!result.success) return res.status(500).json(result);

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});
