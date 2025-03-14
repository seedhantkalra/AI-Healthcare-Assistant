import mongoose from "mongoose";

const keyIdeaSchema = new mongoose.Schema({
    content: { type: String, required: true },  // ✅ Stores the key idea
    timestamp: { type: Date, default: Date.now } // ✅ Stores when it was added
});

const conversationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // ✅ Unique user identifier
    keyIdeas: [keyIdeaSchema],  // ✅ Stores key ideas with timestamps
    lastUpdated: { type: Date, default: Date.now }
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
