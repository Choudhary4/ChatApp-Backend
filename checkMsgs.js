import mongoose from "mongoose";
import dotenv from "dotenv";
import { Conversation } from "./models/conversationModel.js";
import { Message } from "./models/messageModel.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const hhhhh = await Conversation.findById('6a3a71b81ca208e2c8a00259');
    console.log("hhhhh messages:", hhhhh.messages.length);
    const msgs = await Message.find({ _id: { $in: hhhhh.messages } });
    console.log(msgs.map(m => m.message + " " + m.fileUrl));

    const saurabhJoe = await Conversation.findById('6a3a66bf7d1f45ec5e60511e');
    console.log("Direct messages:", saurabhJoe.messages.length);
    const dmsgs = await Message.find({ _id: { $in: saurabhJoe.messages } });
    console.log(dmsgs.map(m => m.message + " " + m.fileUrl));

    process.exit(0);
});
