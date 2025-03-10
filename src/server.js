import express from "express";
import dotenv from "dotenv";
import { router } from "./routes.js";
import cors from "cors";
import session from "express-session";
import FileStore from "session-file-store"; 

dotenv.config();

const fileStore = FileStore(session);
const app = express();
const PORT = process.env.PORT || 5000;

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
  console.log("SESSION ID:", req.sessionID);
  console.log("Cookies Sent to Client:", req.headers.cookie || "No cookies received");
  console.log("Current Session Data:", JSON.stringify(req.session, null, 2));
  res.setHeader("Access-Control-Allow-Credentials", "true");  
  next();
});

app.use("/api", router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
