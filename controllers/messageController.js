import { Conversation } from "../models/conversationModel.js";
import { Message } from "../models/messageModel.js";
import { User } from "../models/userModel.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

export const sendMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const {message} = req.body;

        // Check if either user has blocked the other
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        // If receiverId is a group, we skip this block logic for now, or we handle it later
        // But since this runs before we know if it's a group, we should only block if it's a 1-to-1 chat.
        // Wait, receiverId could be a Group Conversation ID, so receiver will be null.
        if (receiver && sender) {
            if (sender.blockedUsers.includes(receiverId)) {
                return res.status(403).json({ error: "You have blocked this user" });
            }
            if (receiver.blockedUsers.includes(senderId)) {
                return res.status(403).json({ error: "You are blocked by this user" });
            }
        }

        let fileUrl = "";
        let messageType = "text";

        if(req.file) {
            const uploadFromBuffer = (req) => {
                return new Promise((resolve, reject) => {
                    let cld_upload_stream = cloudinary.uploader.upload_stream(
                        { folder: "chat_app", resource_type: "auto" },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
                });
            };
            const result = await uploadFromBuffer(req);
            fileUrl = result.secure_url;
            
            if(req.file.mimetype.startsWith('image/')) {
                messageType = 'image';
            } else if(req.file.mimetype.startsWith('audio/')) {
                messageType = 'audio';
            } else {
                messageType = 'document';
            }
        }

        if((!message || !message.trim()) && !fileUrl) {
            return res.status(400).json({error: "Message cannot be empty"});
        }

        let isGroupChat = false;
        // Check if receiverId is a group conversation ID
        let gotConversation = null;
        try {
            gotConversation = await Conversation.findById(receiverId);
        } catch (e) {
            // Not a valid objectId for conversation
        }
        
        if (gotConversation && gotConversation.isGroup) {
            isGroupChat = true;
        } else {
            gotConversation = await Conversation.findOne({
                participants:{$all : [senderId, receiverId]},
                isGroup: false
            });

            if(!gotConversation){
                gotConversation = await Conversation.create({
                    participants:[senderId, receiverId],
                    isGroup: false
                })
            };
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            message: message || "",
            messageType,
            fileUrl,
            status: 'sent' // Simplified for groups
        });
        
        if(newMessage){
            gotConversation.messages.push(newMessage._id);
        };
        
        await Promise.all([gotConversation.save(), newMessage.save()]);
         
        // SOCKET IO
        if (isGroupChat) {
            gotConversation.participants.forEach(participantId => {
                if (participantId.toString() !== senderId.toString()) {
                    const participantSocketId = getReceiverSocketId(participantId);
                    if (participantSocketId) {
                        io.to(participantSocketId).emit("newMessage", newMessage);
                    }
                }
            });
        } else {
            const receiverSocketId = getReceiverSocketId(receiverId);
            if(receiverSocketId){
                // optionally update status to delivered here before emit
                io.to(receiverSocketId).emit("newMessage", newMessage);
            }
        }
        return res.status(201).json({
            newMessage
        })
    } catch (error) {
        console.log(error);
    }
}
export const getMessage = async (req,res) => {
    try {
        const receiverId = req.params.id;
        const senderId = req.id;

        let conversation = null;

        // First try to see if receiverId is a group
        try {
            conversation = await Conversation.findById(receiverId).populate("messages");
        } catch (e) {
            // Might not be a valid ObjectId for conversation
        }
        
        if (!conversation || !conversation.isGroup) {
            conversation = await Conversation.findOne({
                participants:{$all : [senderId, receiverId]},
                isGroup: false
            }).populate("messages"); 
        }

        return res.status(200).json(conversation?.messages || []);
    } catch (error) {
        console.log("Error in getMessage:", error);
        return res.status(500).json({error: "Internal server error"});
    }
}

export const editMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const messageId = req.params.id;
        const {message} = req.body;

        const msg = await Message.findById(messageId);
        if(!msg){
            return res.status(404).json({error: "Message not found"});
        }
        
        if(msg.senderId.toString() !== senderId.toString()){
            return res.status(401).json({error: "Unauthorized to edit this message"});
        }

        msg.message = message;
        msg.isEdited = true;
        await msg.save();

        const receiverSocketId = getReceiverSocketId(msg.receiverId);
        if(receiverSocketId){
            io.to(receiverSocketId).emit("messageEdited", msg);
        }

        return res.status(200).json({
            updatedMessage: msg
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error"});
    }
}

export const createGroup = async (req, res) => {
    try {
        const { groupName, participants } = req.body;
        const loggedInUserId = req.id;

        if (!groupName || !participants || participants.length === 0) {
            return res.status(400).json({ error: "Group name and participants are required" });
        }

        // Add the creator to participants
        const allParticipants = [...new Set([...participants, loggedInUserId])];

        const newGroup = await Conversation.create({
            participants: allParticipants,
            isGroup: true,
            groupName: groupName,
            groupAdmin: loggedInUserId
        });

        // Notify all online participants
        allParticipants.forEach(userId => {
            const socketId = getReceiverSocketId(userId);
            if (socketId) {
                // You can emit an event like 'newGroup' if frontend handles it
                io.to(socketId).emit("newGroup", newGroup);
            }
        });

        return res.status(201).json({
            message: "Group created successfully",
            group: newGroup
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export const clearChat = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const targetId = req.params.id;

        let conversation = null;

        // Check if targetId is a group
        try {
            conversation = await Conversation.findById(targetId);
        } catch (e) {}

        if (!conversation || !conversation.isGroup) {
            conversation = await Conversation.findOne({
                participants: { $all: [loggedInUserId, targetId] },
                isGroup: false
            });
        }

        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        // Just empty the messages array to clear chat for both
        conversation.messages = [];
        await conversation.save();

        return res.status(200).json({ success: true, message: "Chat cleared successfully" });
    } catch (error) {
        console.log("Error in clearChat:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}