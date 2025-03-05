// Handles API Routes

import express from "express";

export const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "AI Assistant API is running!" });
});