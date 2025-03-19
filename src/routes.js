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

        const keyTakeaways = response.data.choices?.[0]?.message?.content
            .split("\n")
            .map(point => point.trim())
            .filter(point => point.length > 10)
            .filter(point => !point.toLowerCase().includes("general information") && 
                             !point.toLowerCase().includes("common knowledge"));

        return [...new Set(keyTakeaways)];
    } catch (error) {
        console.error("❌ Error generating key takeaways:", error.response?.data || error.message);
        return [];
    }
}

// ✅ Handle GET requests to /api/chat
router.get("/chat", (req, res) => {
    res.json({ message: "This is the AI chat endpoint. Send a POST request with a message." });
});

// ✅ Handle POST requests to /api/chat
router.post("/chat", async (req, res) => {
    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ error: "User ID and message are required." });
        }

        let conversation = await Conversation.findOne({ userId });
        if (!conversation) {
            conversation = new Conversation({ userId, keyIdeas: [] });
        }

        if (!req.session.conversationHistory) {
            req.session.conversationHistory = [];
        }

        req.session.conversationHistory.push({ role: "user", content: message });

        if (req.session.conversationHistory.length > 5) {
            req.session.conversationHistory.shift();
        }

        console.log("🔹 Session Short-Term Memory Before Sending:", req.session.conversationHistory);

        const userContext = [];
        if (conversation.name && conversation.name !== "ERROR: Unable to decrypt") {
            userContext.push({ role: "system", content: `The user's name is ${conversation.name}.` });
        }
        if (conversation.jobTitle) userContext.push({ role: "system", content: `The user's job title is ${conversation.jobTitle}.` });
        if (conversation.workplace) userContext.push({ role: "system", content: `The user works at ${conversation.workplace}.` });

        // ✅ AI is now more flexible but still redirects users back to relevant topics
        userContext.push({ 
            role: "system", 
            content: "You are a healthcare and workplace assistant. Your primary role is to assist with healthcare and workplace-related topics. " +
                     "However, you can answer brief general knowledge questions when necessary. " +
                     "If a user asks something outside your main domain, provide a short answer and then guide them back by saying: " +
                     "'I specialize in healthcare and workplace topics. Let me know if you need help in those areas.'" 
        });

        const memoryContext = [...userContext, ...conversation.keyIdeas.slice(-5).map(idea => ({
            role: "system",
            content: `Key insight: ${idea.content}`
        }))];

        if (!conversation) {
            console.warn(`⚠️ Unauthorized access attempt: No conversation found for userId ${req.body.userId}`);
            return res.status(403).json({ error: "Unauthorized access." });
        }

        if (conversation.userId !== req.body.userId) {
            console.warn(`⚠️ SECURITY WARNING: User '${req.body.userId}' tried to access '${conversation.userId}' data!`);
            return res.status(403).json({ error: "Unauthorized access. You do not have permission to view this information." });
        }

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    ...memoryContext,
                    ...req.session.conversationHistory
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                }
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

export default router;
