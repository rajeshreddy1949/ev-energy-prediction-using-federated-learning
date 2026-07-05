import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini-Powered Explainer / Optimizer
  app.post("/api/explain", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      let ai;
      try {
        ai = getGemini();
      } catch (keyError: any) {
        // Return a clean user-facing warning if API key is missing
        return res.status(200).json({
          response: "It looks like the `GEMINI_API_KEY` is not set yet. Please configure it in Settings > Secrets to unlock live, customized AI Federated Learning insights. (In the meantime, feel free to use the interactive simulation dashboard!)"
        });
      }

      const systemInstruction = `You are "FedCharge AI", an advanced energy management and decentralized machine learning intelligence agent. 
You specialize in Federated Learning (FL), electric vehicle (EV) battery chemistry, driving mechanics, and differential privacy (DP).
A user is interacting with an "EV Energy Prediction Using Federated Learning" simulator.
Explain concepts clearly, objectively, and using simple but technically accurate terms.
Acknowledge metrics in the current state if provided (e.g., number of rounds, loss, privacy epsilon).
Provide helpful suggestions on how federated learning prevents exposing raw GPS or speed data to a central authority while training a robust energy consumption predictor.
Keep your output formatted in clean Markdown. Avoid using phrases such as "as an AI" or "based on the context provided".`;

      const contents = `
Here is the user's message: "${prompt}"

Current Simulation Context (if available):
${context ? JSON.stringify(context, null, 2) : "No active simulation logs yet."}

Please provide an insightful response. Keep it concise, engaging, and professional.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ response: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred with the AI endpoint." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
