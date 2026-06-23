import mongoose from "mongoose";
import dotenv from "dotenv";
import { Conversation } from "./models/conversationModel.js";
import { Message } from "./models/messageModel.js";
import { User } from "./models/userModel.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const user1 = await User.findOne({ fullName: /saurabh/i });
    const user2 = await User.findOne({ fullName: /joe/i });

    if(user1 && user2) {
        console.log("User1:", user1._id, user1.fullName);
        console.log("User2:", user2._id, user2.fullName);
        
        const conv = await Conversation.findOne({ participants: { $all: [user1._id, user2._id] } });
        if(conv) {
            console.log("Conversation Found! Messages:", conv.messages.length);
            const messages = await Message.find({ _id: { $in: conv.messages } });
            console.log(messages);
        } else {
            console.log("No conversation found between them!");
        }
    }
    process.exit(0);
});
