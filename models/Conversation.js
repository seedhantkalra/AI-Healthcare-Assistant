import mongoose from "mongoose";
import CryptoJS from "crypto-js";

const keyIdeaSchema = new mongoose.Schema({
    content: { 
        type: String, 
        required: true, 
        set: value => CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString(),
        get: value => CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)
    },
    timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, 
    name: { 
        type: String, 
        default: null, 
        set: value => value ? CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString() : null,
        get: value => value ? CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8) : null
    },
    jobTitle: { 
        type: String, 
        default: null,
        set: value => value ? CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString() : null,
        get: value => value ? CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8) : null
    },
    workplace: { 
        type: String, 
        default: null,
        set: value => value ? CryptoJS.AES.encrypt(value, process.env.ENCRYPTION_KEY).toString() : null,
        get: value => value ? CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8) : null
    },
    keyIdeas: [keyIdeaSchema],  
    lastUpdated: { type: Date, default: Date.now }
});

// Enable getters when converting MongoDB objects
conversationSchema.set("toJSON", { getters: true });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
