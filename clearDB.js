import mongoose from "mongoose";
import dotenv from "dotenv";
import { Conversation } from "./models/conversationModel.js";
import { Message } from "./models/messageModel.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    console.log("All conversations and messages deleted.");
    process.exit(0);
});
