import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const router = express.Router();

router.get("/chat", (req, res) => {
  res.json({ message: "This is the AI chat endpoint. Send a POST request with a message." });
});

router.post("/chat", async (req, res) => {
  try {
      const { message } = req.body;
      if (!message) {
          return res.status(400).json({ error: "Message is required" });
      }

      if (!req.session) {
          req.session = {};
      }

      if (!req.session.conversationHistory) {
          req.session.conversationHistory = [];
      }

      console.log("🔹 Current Session History Before Adding:", req.session.conversationHistory);

      req.session.conversationHistory.push({ role: "user", content: message });

      if (req.session.conversationHistory.length > 5) {
          req.session.conversationHistory.shift();
      }

      console.log("🔹 Updated Session History Before Sending:", req.session.conversationHistory);

      const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
              model: "gpt-4o-mini",
              messages: req.session.conversationHistory
          },
          {
              headers: {
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                  "Content-Type": "application/json",
              },
          }
      );

      const aiMessage = {
          role: "assistant",
          content: response.data.choices?.[0]?.message?.content ?? "I'm sorry, but I couldn't generate a response."
      };

      req.session.conversationHistory.push(aiMessage);

      console.log("🔹 Final Session History After AI Response:", req.session.conversationHistory);

      res.json({ response: aiMessage.content });

  } catch (error) {
      res.status(500).json({ error: "Failed to get response from AI" });
  }
});

export default router;
