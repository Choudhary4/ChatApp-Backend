import mongoose from "mongoose";

const conversationModel = new mongoose.Schema({
    participants:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    messages:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Message"
    }],
    isGroup: {
        type: Boolean,
        default: false
    },
    groupName: {
        type: String,
        default: ""
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
},{timestamps:true});
export const Conversation = mongoose.model("Conversation", conversationModel);
