import express from "express";
import dotenv from "dotenv";
import { router } from "./routes.js";
import cors from "cors";
import session from "express-session";
import FileStore from "session-file-store"; 
import mongoose from "mongoose";

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
