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
                    { 
                        role: "system", 
                        content: "Summarize the key **context** of this conversation in 2-3 concise points. \n\n" +
                                 "- Do NOT include general knowledge the AI already knows. \n" +
                                 "- Only keep **unique, discussion-specific insights**.\n" +
                                 "- Prioritize the main **topic and user-specific details**." 
                    },
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

        // ✅ Extract and filter summarized points
        const keyTakeaways = response.data.choices?.[0]?.message?.content
            .split("\n")
            .map(point => point.trim())
            .filter(point => point.length > 10) // ✅ Removes overly short or vague responses
            .filter(point => !point.toLowerCase().includes("general information") && 
                             !point.toLowerCase().includes("common knowledge")); // ✅ Filters out unnecessary facts

        return [...new Set(keyTakeaways)]; // ✅ Ensures uniqueness
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

    
        const aiMessage = {
            role: "assistant",
            content: response.data.choices?.[0]?.message?.content ?? "I'm sorry, but I couldn't generate a response."
        };

        
        req.session.conversationHistory.push(aiMessage);

        console.log("🔹 Updated Session Memory After AI Response:", req.session.conversationHistory);

        
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000; 
        const now = Date.now();
        conversation.keyIdeas = conversation.keyIdeas.filter(idea => now - new Date(idea.timestamp).getTime() < THIRTY_DAYS);

        
        const keyTakeaways = await generateKeyTakeaways([
            { role: "user", content: message },
            aiMessage
        ]);

        
        const newIdeas = keyTakeaways.filter(idea => 
            !conversation.keyIdeas.some(existing => existing.content === idea) &&
            idea.length > 15 &&
            !idea.toLowerCase().includes("basic information") && 
            !idea.toLowerCase().includes("general overview") 
        );

        if (newIdeas.length > 0) {
            conversation.keyIdeas.push(...newIdeas.map(idea => ({ content: idea, timestamp: now })));
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


router.delete("/chat", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: "User ID is required to clear memory." });
        }

    
        const result = await Conversation.findOneAndUpdate(
            { userId },
            { $set: { keyIdeas: [] } }, 
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: "User not found or no memory to clear." });
        }

        console.log(`🧹 Cleared memory for user: ${userId}`);
        res.json({ message: `Successfully cleared AI memory for user: ${userId}` });

    } catch (error) {
        console.error("❌ Error clearing AI memory:", error);
        res.status(500).json({ error: "Failed to clear AI memory." });
    }
});

export default router;
