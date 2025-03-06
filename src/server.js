import express from "express";
import dotenv from "dotenv";
import { router } from "./routes.js";
import cors from "cors";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log("Checking if Express is starting...");
console.log(`PORT value from .env: ${process.env.PORT}`);
console.log(`Server will start on port: ${PORT}`);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);
app.use(cors());
app.use((req, res, next) => {
    console.log(`🔹 Incoming request: ${req.method} ${req.url}`);
    console.log("🔹 Headers:", req.headers);
    console.log("🔹 Body:", req.body);
    next();
  });

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
