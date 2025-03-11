import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Unique user identifier
    keyIdeas: [{ type: String }], // Stores key insights, not full chat history
    lastUpdated: { type: Date, default: Date.now }, // Track when memory was updated
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
