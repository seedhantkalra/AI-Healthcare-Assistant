// Handles API Routes

import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "AI Assistant API is running!" });
});

router.post("/chat", async (req, res) => {
  console.log("✅ Received request at /api/chat:", req.body);

  try {
      const { message } = req.body;
      if (!message) {
          console.log("❌ Error: Message is missing in request body");
          return res.status(400).json({ error: "Message is required" });
      }

      console.log("✅ Sending request to OpenAI...");
      const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
              model: "gpt-4o mini",
              messages: [{ role: "user", content: message }],
          },
          {
              headers: {
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                  "Content-Type": "application/json",
              },
          }
      );

      console.log("✅ OpenAI Response:", response.data);
      res.json({ response: response.data.choices[0].message.content });
  } catch (error) {
      console.error("❌ Error communicating with OpenAI:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to get response from AI" });
  }
});

  
