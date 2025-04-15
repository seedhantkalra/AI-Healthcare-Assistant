import mongoose from "mongoose";
import CryptoJS from "crypto-js";

// This function attempts to decrypt an AES-encrypted value.
// If the value is already plain text or invalid, it returns a fallback.
// It's used to prevent app crashes from corrupted or non-encrypted data.
const safeDecrypt = (value, fieldName) => {
    if (!value || typeof value !== "string") return null;
    if (!value.startsWith("U2FsdGVkX1")) return value; // Indicates it's not encrypted

    try {
        const decryptedText = CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
        return decryptedText || `ERROR: Unable to decrypt ${fieldName}`;
    } catch (error) {
        console.error(`Error decrypting ${fieldName}:`, error.message);
        return `ERROR: Unable to decrypt ${fieldName}`;
    }
};

/**
 * Schema for a single "key idea" — a long-term memory summary of an AI conversation.
 * Each key idea:
 * - Is encrypted when stored.
 * - Is decrypted when retrieved.
 */
const keyIdeaSchema = new mongoose.Schema({
    content: { 
        type: String, 
        required: true, 

        // Automatically encrypt before storing in MongoDB
        set: value => CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString(),

        // Automatically decrypt when reading from MongoDB
        get: value => safeDecrypt(value, "key idea")
    },
    timestamp: { type: Date, default: Date.now }
});

/**
 * Schema for the entire user conversation record.
 * Stores:
 * - userId: identifier for the user
 * - name, jobTitle, workplace: encrypted PII (Personally Identifiable Info)
 * - keyIdeas: long-term memory array
 * - lastUpdated: timestamp for the most recent update
 */
const conversationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Stored in plain text (needed to query by user)

    name: { 
        type: String, 
        default: null,
        
        // Encrypt when saving
        set: value => value ? CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString() : null,

        // Decrypt when reading
        get: value => safeDecrypt(value, "name")
    },

    jobTitle: { 
        type: String, 
        default: null,
        set: value => value ? CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString() : null,
        get: value => safeDecrypt(value, "job title")
    },

    workplace: { 
        type: String, 
        default: null,
        set: value => value ? CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString() : null,
        get: value => safeDecrypt(value, "workplace")
    },

    keyIdeas: [keyIdeaSchema],  // Array of long-term memory items (each with content and timestamp)

    lastUpdated: { 
        type: Date, 
        default: Date.now 
    }
});

// Enable getters when converting this document to JSON
// This ensures decrypted values are included in API responses
conversationSchema.set("toJSON", { getters: true });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
