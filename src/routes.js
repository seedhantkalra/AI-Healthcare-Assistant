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
        console.error("Error generating key takeaways:", error.response?.data || error.message);
        return [];
    }
}

router.get("/chat", (req, res) => {
  res.json({ message: "This is the AI chat endpoint. Send a POST request with a message." });
});

router.post("/chat", async (req, res) => {
    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ error: "User ID and message are required" });
        }

        let conversation = await Conversation.findOne({ userId });
        if (!conversation) {
            conversation = new Conversation({ userId, keyIdeas: [] });
        }

        const memoryContext = conversation.keyIdeas.map(idea => ({ role: "system", content: idea }));

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    ...memoryContext,
                    { role: "user", content: message }
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

        const keyTakeaways = await generateKeyTakeaways([
            { role: "user", content: message },
            aiMessage
        ]);

        conversation.keyIdeas = keyTakeaways;
        conversation.lastUpdated = new Date();
        await conversation.save();

        console.log("Updated Key Ideas After AI Response:", conversation.keyIdeas);

        res.json({ response: aiMessage.content });

    } catch (error) {
        console.error("Error communicating with OpenAI:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to get response from AI" });
    }
});

export default router;
