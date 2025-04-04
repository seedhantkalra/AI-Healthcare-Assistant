// config.js
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
};

export const sessionSecret = process.env.SESSION_SECRET;
export const openaiApiKey = process.env.OPENAI_API_KEY;
export const mongoUri = process.env.MONGO_URI;
export const encryptionSecret = process.env.ENCRYPTION_SECRET;

export const encrypt = (text) => {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(encryptionSecret, 'utf8').slice(0, 32),
    Buffer.from(encryptionSecret, 'utf8').slice(0, 16) // IV
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};
