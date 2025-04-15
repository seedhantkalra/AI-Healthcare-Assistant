import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import Conversation from "../models/Conversation.js";
import { verifyToken } from "../utils/auth.js";
import { encrypt } from "./config.js"; 

dotenv.config();


// Create router instance for mounting API endpoints
export const router = express.Router();

/**
 * Helper: Generates key takeaways from full conversation history.
 * - Uses GPT-4o-mini to analyze the full conversation and return 2–3 discussion-specific insights.
 * - These are stored in MongoDB for long-term memory.
 */
async function generateKeyTakeaways(conversationHistory) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Summarize the key **context** of this conversation in 2-3 concise points. Do NOT include general knowledge the AI already knows. Only keep **unique, discussion-specific insights**.",
          },
          ...conversationHistory,
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Clean and filter the AI's summary points
    const keyTakeaways = response.data.choices?.[0]?.message?.content
      .split("\n")
      .map((point) => point.trim())
      .filter((point) => point.length > 10);

    return [...new Set(keyTakeaways)]; // Remove duplicates
  } catch (error) {
    console.error("Error generating key takeaways:", error.response?.data || error.message);
    return [];
  }
}

/**
 * ✅ POST /api/create-user
 * - Creates a new user in MongoDB if they don't exist already.
 * - Encrypts name, jobTitle, and workplace before saving.
 */
router.post("/create-user", async (req, res) => {
  try {

    // Decode user info from token
    const { userId, name, jobTitle, workplace } = await verifyToken(req);

    // Prevent duplicate user creation
    const exists = await Conversation.findOne({ userId });
    if (exists) return res.json({ message: "User already exists." });

    // Create new user conversation document
    const conversation = await Conversation.create({
      userId,
      name: encrypt(name),
      jobTitle: encrypt(jobTitle),
      workplace: encrypt(workplace),
      keyIdeas: [],
      lastUpdated: new Date(),
    });

    res.json({ message: "User created...", conversation });
  } catch (error) {
    console.error("User creation failed:", error.message);
    res.status(401).json({ error: error.message });
  }
});

/**
 * POST /api/chat
 * - Handles user message submission, AI reply, session memory, and memory summarization.
 */
router.post("/chat", async (req, res) => {
  try {

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required." });

    // Decode user details from token
    const { userId, name, jobTitle, workplace } = await verifyToken(req);

    // Retrieve user's conversation doc from DB
    const conversation = await Conversation.findOne({ userId });
    if (!conversation) return res.status(404).json({ error: "No conversation found." });

    // Initialize session-based short-term memory if needed
    if (!req.session.conversationHistory) {
      req.session.conversationHistory = [];
    }

    // Add user message to session memory
    req.session.conversationHistory.push({ role: "user", content: message });

    // Keep only last 20 messages
    if (req.session.conversationHistory.length > 20) {
      req.session.conversationHistory.shift();
    }
  
    /**
     * Build system prompt with context for GPT
     * - Includes user info + behavioral instructions
     */
    const userContext = [
      { role: "system", content: `The user's name is ${name}.` },
      { role: "system", content: `The user's job title is ${jobTitle}.` },
      { role: "system", content: `The user works at ${workplace}.` },
      {
        role: "system",
        content: `You are an AI assistant who helps users with healthcare and workplace challenges in a concise, friendly, and personal way.

Your tone should feel warm, encouraging, and professional — like a smart coworker or nurse friend. Refer to the user's name, job title, or workplace when you know it and when it feels natural to do so.

👍 Topics you're best at:
- Managing stress, fatigue, or burnout
- Physical and mental health tips for work
- Posture, pain relief, shift prep
- Time management and routines

🤝 When a user asks about something outside these areas (like math, geography, or trivia), do NOT say “I can’t help.” Instead:
- Give a short, polite answer (if possible)
- Redirect them with a soft nudge back to your specialties

Example:  
Q: What's the capital of France?  
A: That's Paris! I usually help with healthcare and work-related topics, but feel free to ask me anything in those areas too 😊`,
      },
    ];

    // Send full conversation + context to OpenAI
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [...userContext, ...req.session.conversationHistory],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiMessageContent = response.data.choices?.[0]?.message?.content;
    if (!aiMessageContent) {
      return res.status(500).json({ error: "AI did not respond." });
    }

    // Add AI reply to session memory
    const aiMessage = { role: "assistant", content: aiMessageContent };
    req.session.conversationHistory.push(aiMessage);

    /**
     * Generate a long-term memory summary (key idea)
     * - AI summarizes the conversation in 1–2 sentences
     */
    const threadText = req.session.conversationHistory.map(m =>
      `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`
    ).join('\n');

    const summaryPrompt = `Summarize the key point(s) of this healthcare chat in 1–2 sentences for future memory recall:\n${threadText}`;

    const summaryRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [{ role: "system", content: summaryPrompt }],
        max_tokens: 100,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const summary = summaryRes.data.choices?.[0]?.message?.content?.trim();
    if (summary) {
      // Append to user's long-term memory in MongoDB
      conversation.keyIdeas.push({
        content: summary,
        timestamp: Date.now(),
      });
    }

    // Update last modified timestamp and save
    conversation.lastUpdated = new Date();
    await conversation.save();

    // Send AI response back to frontend
    res.json({ response: aiMessageContent });
  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(401).json({ error: error.message });
  }
});

export default router;
