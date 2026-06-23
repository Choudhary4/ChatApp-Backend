import mongoose from "mongoose";

const messageModel = new mongoose.Schema({
    senderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    receiverId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    message:{
        type:String,
        default: ""
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'audio', 'document'],
        default: 'text'
    },
    fileUrl: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    },
    isEdited: {
        type: Boolean,
        default: false
    }
},{timestamps:true});
export const Message = mongoose.model("Message", messageModel);