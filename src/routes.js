import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import Conversation from "../models/Conversation.js";
import bcrypt from "bcrypt";
import User from "../models/User.js";

dotenv.config();
export const router = express.Router();

// ✅ AUTH: Register user
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ email, passwordHash });
    req.session.userId = user._id;

    res.json({ message: "✅ Registered & logged in", userId: user._id });
  } catch (err) {
    console.error("❌ Registration Error:", err);
    res.status(500).json({ error: "Registration failed." });
  }
});

// ✅ AUTH: Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user._id;
    res.json({ message: "✅ Logged in", userId: user._id });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ error: "Login failed." });
  }
});

// ✅ AUTH: Logout user
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "✅ Logged out" });
});

// ✅ PROFILE: Update user info (name, jobTitle, workplace)
router.put("/update-profile", async (req, res) => {
  try {
    const { userId, name, jobTitle, workplace } = req.body;
    const requestorId = req.headers["x-user-id"];

    if (!userId || requestorId !== userId) {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    const conversation = await Conversation.findOne({ userId });
    if (!conversation) {
      return res.status(404).json({ error: "User profile not found." });
    }

    if (name) conversation.name = name;
    if (jobTitle) conversation.jobTitle = jobTitle;
    if (workplace) conversation.workplace = workplace;
    conversation.lastUpdated = new Date();

    await conversation.save();

    res.json({ message: "✅ Profile updated", profile: conversation });
  } catch (err) {
    console.error("❌ Profile Update Error:", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

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
A: That's Paris! I usually help with healthcare and work-related topics, but feel free to ask me anything in those areas too 😊`
    });

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
      return res.status(500).json({ error: "AI did not generate a response." });
    }

    const aiMessage = { role: "assistant", content: aiMessageContent };
    req.session.conversationHistory.push(aiMessage);

    // ✅ NEW: Generate 1 summary for the full conversation
    const threadText = req.session.conversationHistory.map(m =>
      `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`
    ).join('\n');

    const summaryPrompt = `
Summarize the key point(s) of this healthcare chat conversation in 1–2 sentences.
Be professional and make the summary useful for remembering this chat topic later.

Conversation:
${threadText}
`;

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
    console.error("Error during AI chat:", error);
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

    res.json({ message: "User created!", conversation });
  } catch (error) {
    console.error("Failed to create user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

export default router;
