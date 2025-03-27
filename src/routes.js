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
      content: `You are an AI assistant specializing in healthcare and workplace support. 
You are NOT a general assistant and should not answer off-topic questions.

✅ Your core areas include:
- Providing physical and mental health tips for workers
- Helping with stress, posture, fatigue, time management, burnout
- Workplace accommodations, shift schedules, and health routines

❌ Avoid general topics like math, geography, politics, pop culture.
If asked, give a brief answer and redirect by saying:
"I specialize in healthcare and workplace topics. Let me know if you need help in those areas."

Here are examples of GOOD questions:
- "How can I manage stress during a busy shift?"
- "What are good stretches for neck pain?"
- "How should I prepare for a night shift as a nurse?"

BAD examples (redirect):
- "What’s the capital of France?"
- "Tell me a joke."
- "How do I invest in crypto?"
`
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
      console.error("Error: AI did not return a response.");
      return res.status(500).json({ error: "AI did not generate a response." });
    }

    const aiMessage = { role: "assistant", content: aiMessageContent };
    req.session.conversationHistory.push(aiMessage);

    console.log( "Updated Session Memory After AI Response:", req.session.conversationHistory);

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
    console.error("Error communicating with OpenAI:", error.response?.data || error.message);
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
