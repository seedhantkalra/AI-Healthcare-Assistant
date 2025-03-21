import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import Conversation from "../models/Conversation.js";

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
              "Summarize the key **context** of this conversation in 2-3 concise points. Do NOT include general knowledge the AI already knows. Only keep **unique, discussion-specific insights**. Prioritize the main **topic and user-specific details**.",
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
    console.error("❌ Error generating key takeaways:", error.response?.data || error.message);
    return [];
  }
}

router.get("/chat", (req, res) => {
  res.json({ message: "This is the AI chat endpoint. Send a POST request with a message." });
});

router.post("/chat", async (req, res) => {
  try {
    const { userId, message } = req.body;
    const requestorId = req.headers["x-user-id"];

    if (!userId || !message) {
      return res.status(400).json({ error: "User ID and message are required." });
    }

    if (requestorId !== userId) {
      return res.status(403).json({
        error: "Unauthorized access. You cannot view another user's data.",
      });
    }

    const conversation = await Conversation.findOne({ userId });
    if (!conversation) {
      return res.status(404).json({ error: "No conversation found for this user." });
    }

    if (!req.session.conversationHistory) {
      req.session.conversationHistory = [];
    }

    req.session.conversationHistory.push({ role: "user", content: message });
    if (req.session.conversationHistory.length > 20) {
      req.session.conversationHistory.shift();
    }

    console.log("🔹 Session Short-Term Memory Before Sending:", req.session.conversationHistory);

    const userContext = [];
    if (conversation.name && conversation.name !== "ERROR: Unable to decrypt") {
      userContext.push({ role: "system", content: `The user's name is ${conversation.name}.` });
    }
    if (conversation.jobTitle) {
      userContext.push({ role: "system", content: `The user's job title is ${conversation.jobTitle}.` });
    }
    if (conversation.workplace) {
      userContext.push({ role: "system", content: `The user works at ${conversation.workplace}.` });
    }

    userContext.push({
      role: "system",
      content:
        "You are a healthcare and workplace assistant. Your primary role is to assist with healthcare and workplace-related topics. " +
        "However, you can answer brief general knowledge questions when necessary. " +
        "If a user asks something outside your main domain, provide a short answer and then guide them back by saying: " +
        "'I specialize in healthcare and workplace topics. Let me know if you need help in those areas.'",
    });

    const memoryContext = [
      ...userContext,
      ...conversation.keyIdeas.slice(-5).map((idea) => ({
        role: "system",
        content: `Key insight: ${idea.content}`,
      })),
    ];

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [...memoryContext, ...req.session.conversationHistory],
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
      console.error("❌ Error: AI did not return a response.");
      return res.status(500).json({ error: "AI did not generate a response." });
    }

    const aiMessage = { role: "assistant", content: aiMessageContent };
    req.session.conversationHistory.push(aiMessage);

    console.log("🔹 Updated Session Memory After AI Response:", req.session.conversationHistory);

    const keyTakeaways = await generateKeyTakeaways([
      { role: "user", content: message },
      aiMessage,
    ]);

    const newIdeas = keyTakeaways.filter(
      (idea) =>
        !conversation.keyIdeas.some((existing) => existing.content === idea) &&
        idea.length > 15 &&
        !idea.toLowerCase().includes("basic information") &&
        !idea.toLowerCase().includes("general overview")
    );

    if (newIdeas.length > 0) {
      conversation.keyIdeas.push(
        ...newIdeas.map((idea) => ({
          content: idea,
          timestamp: Date.now(),
        }))
      );
    }

    conversation.lastUpdated = new Date();
    await conversation.save();

    console.log("🔹 Updated Long-Term Memory After AI Response:", conversation.keyIdeas);

    res.json({ response: aiMessage.content });
  } catch (error) {
    console.error("❌ Error communicating with OpenAI:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to get response from AI" });
  }
});

// ✅ NEW: Create test user via API
router.post("/create-user", async (req, res) => {
  try {
    const { userId, name, jobTitle, workplace } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required." });
    }

    const exists = await Conversation.findOne({ userId });
    if (exists) return res.json({ message: "User already exists." });

    const conversation = await Conversation.create({
      userId,
      name,
      jobTitle,
      workplace,
    });

    res.json({ message: "✅ User created!", conversation });
  } catch (error) {
    console.error("❌ Failed to create user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

export default router;