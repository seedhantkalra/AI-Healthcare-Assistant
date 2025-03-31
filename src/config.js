

import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
};

export const sessionSecret = process.env.SESSION_SECRET;
export const openaiApiKey = process.env.OPENAI_API_KEY;
export const mongoUri = process.env.MONGO_URI;
export const encryptionSecret = process.env.ENCRYPTION_SECRET;

