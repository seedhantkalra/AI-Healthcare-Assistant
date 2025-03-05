// Main Backend Server File
// Description: This file is the main server file for the backend. It is responsible for setting up the server and connecting to the database.

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { router } from "./routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // Allows parsing of JSON requests

// Use routes from routes.js
app.use("/api", router);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});