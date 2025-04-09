import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import Conversation from "../models/Conversation.js";
import { verifyToken } from "../utils/auth.js";
import { encrypt } from "./config.js"; 

dotenv.config();
export const router = express.Router();

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

    const keyTakeaways = response.data.choices?.[0]?.message?.content
      .split("\n")
      .map((point) => point.trim())
      .filter((point) => point.length > 10);

    return [...new Set(keyTakeaways)];
  } catch (error) {
    console.error("Error generating key takeaways:", error.response?.data || error.message);
    return [];
  }
}

router.post("/create-user", async (req, res) => {
  try {
    const { userId, name, jobTitle, workplace } = await verifyToken(req);

    const exists = await Conversation.findOne({ userId });
    if (exists) return res.json({ message: "User already exists." });

    const conversation = await Conversation.create({
      userId,
      name: encrypt(name),
      jobTitle: encrypt(jobTitle),
      workplace: encrypt(workplace),
      keyIdeas: [],
      lastUpdated: new Date(),
    });

    res.json({ message: "✅ User created!", conversation });
  } catch (error) {
    console.error("❌ User creation failed:", error.message);
    res.status(401).json({ error: error.message });
  }
});

// ✅ Chat using token identity only
router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required." });

    const { userId, name, jobTitle, workplace } = await verifyToken(req);

    const conversation = await Conversation.findOne({ userId });
    if (!conversation) return res.status(404).json({ error: "No conversation found." });

    // Setup session chat history
    if (!req.session.conversationHistory) {
      req.session.conversationHistory = [];
    }

    req.session.conversationHistory.push({ role: "user", content: message });
    if (req.session.conversationHistory.length > 20) {
      req.session.conversationHistory.shift();
    }

    // Prepare prompt context
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

    // Get AI response
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

    const aiMessage = { role: "assistant", content: aiMessageContent };
    req.session.conversationHistory.push(aiMessage);

    // 🔍 Generate & store summary
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
      conversation.keyIdeas.push({
        content: summary,
        timestamp: Date.now(),
      });
    }

    conversation.lastUpdated = new Date();
    await conversation.save();

    res.json({ response: aiMessageContent });
  } catch (error) {
    console.error("❌ Chat Error:", error.message);
    res.status(401).json({ error: error.message });
  }
});

export default router;
