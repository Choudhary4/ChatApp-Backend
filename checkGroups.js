import mongoose from "mongoose";
import dotenv from "dotenv";
import { Conversation } from "./models/conversationModel.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const convs = await Conversation.find({});
    for (const c of convs) {
        console.log("Conv:", c._id, c.isGroup ? c.groupName : "Direct", c.participants.length, "participants, messages:", c.messages.length);
    }
    process.exit(0);
});
