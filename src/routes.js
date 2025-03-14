import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import Conversation from "../models/Conversation.js";

dotenv.config();
export const router = express.Router();

// ✅ Generate key takeaways for long-term memory
async function generateKeyTakeaways(conversationHistory) {
    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Summarize the key ideas from this conversation into 2-3 bullet points." },
                    ...conversationHistory
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                }
            }
        );

        return response.data.choices?.[0]?.message?.content.split("\n") || [];
    } catch (error) {
        console.error("❌ Error generating key takeaways:", error.response?.data || error.message);
        return [];
    }
}

// ✅ Handle GET requests to /api/chat
router.get("/chat", (req, res) => {
  res.json({ message: "This is the AI chat endpoint. Send a POST request with a message." });
});

// ✅ Handle POST requests to /api/chat (Short-Term + Long-Term Memory)
router.post("/chat", async (req, res) => {
    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ error: "User ID and message are required" });
        }

        // ✅ Retrieve past key ideas for the user (Long-Term Memory)
        let conversation = await Conversation.findOne({ userId });
        if (!conversation) {
            conversation = new Conversation({ userId, keyIdeas: [] });
        }

        // ✅ SHORT-TERM MEMORY: Store user messages within session
        if (!req.session.conversationHistory) {
            req.session.conversationHistory = [];
        }

        // ✅ Append new message to session history (short-term memory)
        req.session.conversationHistory.push({ role: "user", content: message });

        // ✅ Limit short-term memory to last 5 messages
        if (req.session.conversationHistory.length > 5) {
            req.session.conversationHistory.shift();
        }

        console.log("🔹 Session Short-Term Memory Before Sending:", req.session.conversationHistory);

        // ✅ Merge short-term memory + key ideas for AI
        const memoryContext = conversation.keyIdeas.map(idea => ({ role: "system", content: idea }));
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    ...memoryContext, // ✅ Long-term memory
                    ...req.session.conversationHistory // ✅ Short-term memory
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                }
            }
        );

        // ✅ Get AI response
        const aiMessage = {
            role: "assistant",
            content: response.data.choices?.[0]?.message?.content ?? "I'm sorry, but I couldn't generate a response."
        };

        // ✅ Append AI response to short-term memory
        req.session.conversationHistory.push(aiMessage);

        console.log("🔹 Updated Session Memory After AI Response:", req.session.conversationHistory);

        // ✅ Extract key takeaways (long-term memory)
        const keyTakeaways = await generateKeyTakeaways([
            { role: "user", content: message },
            aiMessage
        ]);

        // ✅ Append new key takeaways to MongoDB memory (prevent duplicates)
        conversation.keyIdeas = [...new Set([...conversation.keyIdeas, ...keyTakeaways])];
        conversation.lastUpdated = new Date();
        await conversation.save();

        console.log("🔹 Updated Long-Term Memory After AI Response:", conversation.keyIdeas);

        res.json({ response: aiMessage.content });

    } catch (error) {
        console.error("❌ Error communicating with OpenAI:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to get response from AI" });
    }
});

export default router;
