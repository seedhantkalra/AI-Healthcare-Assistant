import mongoose from "mongoose";
import CryptoJS from "crypto-js";

const safeDecrypt = (value, fieldName) => {
    if (!value || typeof value !== "string") return null;
    if (!value.startsWith("U2FsdGVkX1")) return value;

    try {
        const decryptedText = CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
        return decryptedText || `ERROR: Unable to decrypt ${fieldName}`;
    } catch (error) {
        console.error(`Error decrypting ${fieldName}:`, error.message);
        return `ERROR: Unable to decrypt ${fieldName}`;
    }
};

const keyIdeaSchema = new mongoose.Schema({
    content: { 
        type: String, 
        required: true, 
        set: value => CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString(),
        get: value => safeDecrypt(value, "key idea")
    },
    timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, 
    name: { 
        type: String, 
        default: null, 
        set: value => value ? CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString() : null,
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
    keyIdeas: [keyIdeaSchema],  
    lastUpdated: { type: Date, default: Date.now }
});

conversationSchema.set("toJSON", { getters: true });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
