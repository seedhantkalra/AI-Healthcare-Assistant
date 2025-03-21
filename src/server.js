import express from "express";
import dotenv from "dotenv";
import router  from "./routes.js";
import cors from "cors";
import session from "express-session";
import FileStore from "session-file-store"; 
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";


dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ai_assistant";
const fileStore = FileStore(session);
const app = express();
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.error("MongoDB Connection Error:", error);
    });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new fileStore({ path: "./sessions" }),
  secret: "healthcare-ai-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
      maxAge: 600000, 
      secure: false,    
      httpOnly: false,  
      sameSite: "lax"   
  }
}));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");  
  next();
});

app.use("/api", router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function cleanExpiredMemories() {
  try {
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      const expiryDate = new Date(Date.now() - THIRTY_DAYS);

      // ✅ Remove old key ideas from all users
      await Conversation.updateMany({}, { 
          $pull: { keyIdeas: { timestamp: { $lt: expiryDate } } }
      });

      console.log("🧹 Old key takeaways removed from memory.");
  } catch (error) {
      console.error("❌ Error cleaning expired memories:", error);
  }
}

// ✅ Run cleanup every 24 hours
setInterval(cleanExpiredMemories, 24 * 60 * 60 * 1000);
