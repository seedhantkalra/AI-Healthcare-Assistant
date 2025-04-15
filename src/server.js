import express from "express";
import dotenv from "dotenv";
import router  from "./routes.js";
import cors from "cors";
import session from "express-session";
import FileStore from "session-file-store"; 
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";


dotenv.config();

// MongoDB URI (defaults to local DB if not set in .env)
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ai_assistant";

// Create a file-based session store using session-file-store
const fileStore = FileStore(session);

// Create Express app instance
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.error("MongoDB Connection Error:", error);
    });

// Middleware to allow cross-origin frontend access
app.use(cors());


// Middleware to parse incoming JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session storage
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

// Ensures session cookies can be shared cross-origin (when using credentials)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");  
  next();
});


// Mount all API routes under "/api"
app.use("/api", router);

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

/**
 * Cleanup Function:
 * Deletes key ideas (long-term memory summaries) older than 30 days
 * from each user's conversation document in MongoDB.
 */
async function cleanExpiredMemories() {
  try {
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;              // Milliseconds in 30 days
      const expiryDate = new Date(Date.now() - THIRTY_DAYS);     // Calculate date threshold

      // Use $pull to remove outdated keyIdeas based on timestamp
      await Conversation.updateMany({}, { 
          $pull: { keyIdeas: { timestamp: { $lt: expiryDate } } }
      });

      console.log("Old key takeaways removed from memory.");
  } catch (error) {
      console.error("Error cleaning expired memories:", error);
  }
}

// Run cleanup every 24 hours
setInterval(cleanExpiredMemories, 24 * 60 * 60 * 1000);
