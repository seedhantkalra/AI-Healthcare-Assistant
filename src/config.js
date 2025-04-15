// config.js
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

/**
 * Export configuration object:
 * - port: fallback to 5000 if not defined
 */
export const config = {
  port: process.env.PORT || 5000,
};

// Other individual config variables for reuse throughout the project
export const sessionSecret = process.env.SESSION_SECRET;
export const openaiApiKey = process.env.OPENAI_API_KEY;
export const mongoUri = process.env.MONGO_URI;
export const encryptionSecret = process.env.ENCRYPTION_SECRET;


/**
 * AES-256-CBC Encryption Function
 * - Takes a plain text string and returns an encrypted hex string.
 * - Uses a 256-bit key (first 32 bytes of encryptionSecret)
 *   and a 128-bit IV (first 16 bytes of encryptionSecret).
 */
export const encrypt = (text) => {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(encryptionSecret, 'utf8').slice(0, 32), // Key
    Buffer.from(encryptionSecret, 'utf8').slice(0, 16)  // IV (initialization vector)
  );

  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};
