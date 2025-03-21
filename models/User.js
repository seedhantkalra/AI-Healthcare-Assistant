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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: "Login failed." });
  }
});

// ✅ AUTH: Logout user
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "✅ Logged out" });
});

// ... (existing generateKeyTakeaways, chat route, and create-user route remain unchanged)

export default router;

