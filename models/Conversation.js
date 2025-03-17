import mongoose from "mongoose";

const keyIdeaSchema = new mongoose.Schema({
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, 
    name: { type: String, default: null }, // ✅ Stores user name
    jobTitle: { type: String, default: null }, // ✅ Stores user job title
    workplace: { type: String, default: null }, // ✅ Stores workplace
    keyIdeas: [keyIdeaSchema],  
    lastUpdated: { type: Date, default: Date.now }
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;

