import mongoose from "mongoose";
import CryptoJS from "crypto-js";

const keyIdeaSchema = new mongoose.Schema({
    content: { 
        type: String, 
        required: true, 
        set: value => CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString(),
        get: value => {
            if (!value) return null;
            try {
                return CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
            } catch (error) {
                console.error("❌ Error decrypting key idea:", error.message);
                return "ERROR: Unable to decrypt";
            }
        }
    },
    timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, 
    name: { 
        type: String, 
        default: null, 
        set: value => value ? CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString() : null,
        get: value => {
            if (!value) return null;
            try {
                return CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
            } catch (error) {
                console.error("❌ Error decrypting name:", error.message);
                return "ERROR: Unable to decrypt";
            }
        }
    },
    jobTitle: { 
        type: String, 
        default: null,
        set: value => value ? CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString() : null,
        get: value => {
            if (!value) return null;
            try {
                return CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
            } catch (error) {
                console.error("❌ Error decrypting job title:", error.message);
                return "ERROR: Unable to decrypt";
            }
        }
    },
    workplace: { 
        type: String, 
        default: null,
        set: value => value ? CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString() : null,
        get: value => {
            if (!value) return null;
            try {
                return CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
            } catch (error) {
                console.error("❌ Error decrypting workplace:", error.message);
                return "ERROR: Unable to decrypt";
            }
        }
    },
    keyIdeas: [keyIdeaSchema],  
    lastUpdated: { type: Date, default: Date.now }
});

// Enable getters when converting MongoDB objects
conversationSchema.set("toJSON", { getters: true });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
