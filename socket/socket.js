import {Server} from "socket.io";
import http from "http";
import express from "express";
import { Message } from "../models/messageModel.js";

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:3000",
            "https://chatapp-frontend-one-mauve.vercel.app"
        ],
        methods: ['GET', 'POST'],
        credentials: true
    },
});

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
}

const userSocketMap = {}; // {userId->socketId}


io.on('connection', (socket)=>{
    const userId = socket.handshake.query.userId
    if(userId !== undefined){
        userSocketMap[userId] = socket.id;
    } 

    io.emit('getOnlineUsers',Object.keys(userSocketMap));

    socket.on('typing', ({ senderId, receiverId }) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing', { senderId });
        }
    });

    socket.on('stopTyping', ({ senderId, receiverId }) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('stopTyping', { senderId });
        }
    });

    socket.on('markAsRead', async ({ senderId, receiverId }) => {
        try {
            await Message.updateMany(
                { senderId: senderId, receiverId: receiverId, status: { $ne: 'read' } },
                { $set: { status: 'read' } }
            );
            
            const senderSocketId = getReceiverSocketId(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit('messagesRead', { receiverId });
            }
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('disconnect', ()=>{
        delete userSocketMap[userId];
        io.emit('getOnlineUsers',Object.keys(userSocketMap));
    })

})

export {app, io, server};

