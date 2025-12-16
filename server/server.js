import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { OpenRouter } from "@openrouter/sdk";

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const app = express();
const projectRoot = path.join(__dirname, "..");

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(projectRoot, "public")));
app.use("/css", express.static(path.join(projectRoot, "public", "css")));
app.use("/js", express.static(path.join(projectRoot, "public", "js")));
app.use("/assets", express.static(path.join(projectRoot, "public", "assets")));

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(projectRoot, "public", "pages", "index.html"));
});

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "tngtech/deepseek-r1t2-chimera:free";

let client = null;
if (
  OPENROUTER_API_KEY &&
  OPENROUTER_API_KEY !== "your_openrouter_api_key_here"
) {
  client = new OpenRouter({ apiKey: OPENROUTER_API_KEY });
}

/**
 * Standard response handler function
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {object} data - Response data
 * @param {string} errorMessage - Optional error message
 */
function sendResponse(res, statusCode, data, errorMessage = null) {
  const response = {
    success: statusCode >= 200 && statusCode < 300,
    ...data,
  };

  if (errorMessage) {
    response.error = errorMessage;
  }

  return res.status(statusCode).json(response);
}

/**
 * API Endpoint: Generate AI Reflection
 * Method: POST
 * Body: { mood: string, entry: string }
 */
app.post("/api/reflection", async (req, res) => {
  try {
    const { mood, entry } = req.body;

    // Validate input
    if (!mood || !entry) {
      return sendResponse(
        res,
        400,
        {},
        "Missing required fields: mood and entry"
      );
    }

    // Check if API key is configured
    if (!client) {
      console.warn("OpenRouter API key not configured. Using mock response.");
      const mockResponse = getMockResponse(mood, entry);

      return sendResponse(res, 200, {
        reflection: mockResponse.reflection,
        suggestion: mockResponse.suggestion,
        mood,
        usingMock: true,
      });
    }

    const prompt = `You are a compassionate mental health companion. A user is feeling ${mood} and shared: "${entry}"\n\nProvide:\n1. A brief, empathetic reflection (2-3 sentences) acknowledging their feelings\n2. One specific, actionable suggestion to help them feel better\n\nRespond in JSON format: {"reflection": "...", "suggestion": "..."}`;

    const response = await client.chat.send({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    const generatedText = response.choices[0].message.content;

    // Try to parse JSON from response
    let parsedResponse;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch =
        generatedText.match(/```json\n([\s\S]*?)\n```/) ||
        generatedText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch
        ? jsonMatch[1] || jsonMatch[0]
        : generatedText;
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.warn("Failed to parse Gemini response as JSON, using fallback");
      // Fallback if JSON parsing fails
      const mockResponse = getMockResponse(mood, entry);
      parsedResponse = {
        reflection: generatedText.substring(0, 200) || mockResponse.reflection,
        suggestion: mockResponse.suggestion,
      };
    }

    return sendResponse(res, 200, {
      reflection: parsedResponse.reflection,
      suggestion: parsedResponse.suggestion,
      mood,
      usingMock: false,
    });
  } catch (error) {
    console.error("Error in /api/reflection:", error.message);

    // Fallback to mock response on error
    const mockResponse = getMockResponse(req.body.mood, req.body.entry);

    return sendResponse(
      res,
      200,
      {
        reflection: mockResponse.reflection,
        suggestion: mockResponse.suggestion,
        mood: req.body.mood,
        usingMock: true,
      },
      "API error, using fallback response"
    );
  }
});

/**
 * API Endpoint: Submit PHQ-2 Quiz
 * Method: POST
 * Body: { q1: number, q2: number }
 */
app.post("/api/quiz", async (req, res) => {
  try {
    const { q1, q2 } = req.body;

    // Validate input
    if (q1 === undefined || q2 === undefined) {
      return sendResponse(res, 400, {}, "Missing required fields: q1 and q2");
    }

    const score1 = parseInt(q1, 10);
    const score2 = parseInt(q2, 10);

    if (isNaN(score1) || isNaN(score2)) {
      return sendResponse(res, 400, {}, "Invalid scores. Must be numbers.");
    }

    const totalScore = score1 + score2;
    let message = "";

    if (totalScore <= 2) {
      message =
        "Your responses suggest minimal symptoms. Continue with self-care and monitoring your mental health.";
    } else if (totalScore <= 4) {
      message =
        "Your responses suggest mild symptoms. Consider speaking with a healthcare provider about your mental health.";
    } else {
      message =
        "Your responses suggest more significant symptoms. We recommend connecting with a mental health professional for support.";
    }

    return sendResponse(res, 200, {
      totalScore,
      message,
      needsHelp: totalScore >= 3,
    });
  } catch (error) {
    console.error("Error in /api/quiz:", error);
    return sendResponse(
      res,
      500,
      {
        message: error.message,
      },
      "Internal server error"
    );
  }
});

/**
 * Helper function to generate mock response when Gemini API is unavailable
 */
function getMockResponse(mood, entry) {
  const reflections = {
    calm: "It's wonderful that you're feeling calm. This sense of peace is valuable and worth savoring.",
    happy:
      "Your happiness is evident in your words. It's great to see you in such a positive state.",
    anxious:
      "Thank you for sharing your feelings. Anxiety can be overwhelming, but acknowledging it is an important first step.",
    sad: "I hear you, and your feelings are valid. It takes courage to express sadness and vulnerability.",
    tired:
      "Rest is essential for your well-being. It's okay to acknowledge when you need to recharge.",
  };

  const suggestions = {
    calm: "Continue what you're doing! Try a short meditation or journaling session to maintain this peace.",
    happy:
      "Great! Share your joy with someone or do something creative to extend this positive energy.",
    anxious:
      "Try deep breathing exercises (4-7-8 technique) or a short walk outside to help ease your anxiety.",
    sad: "Be gentle with yourself. Consider reaching out to a friend or doing a comfort activity that brings you solace.",
    tired:
      "Rest is important. Try a power nap or some gentle stretching to restore your energy.",
  };

  const reflection =
    reflections[mood] ||
    `Thank you for sharing. When feeling ${mood}, it's important to acknowledge your emotions.`;
  const suggestion = suggestions[mood] || "Take a moment for self-care today.";

  return { reflection, suggestion };
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  sendResponse(res, 200, {
    status: "ok",
    message: "Mind Oasis API is running",
  });
});

// Start server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🌿 Mind Oasis running on http://localhost:${PORT}`);
  });
}

export default app;
