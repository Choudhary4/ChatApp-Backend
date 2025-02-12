import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/database.js";
import userRoute from "./routes/userRoute.js";
import messageRoute from "./routes/messageRoute.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app, server } from "./socket/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ✅ Updated CORS Configuration
const corsOptions = {
    origin: ["http://localhost:3000", "https://chatapp-frontend-one-mauve.vercel.app"], // Allow frontend URLs
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Allow cookies if required
    preflightContinue: false,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests

// Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/message", messageRoute);

// Start Server
server.listen(PORT, async () => {
    await connectDB();
    console.log(`✅ Server is running on port ${PORT}`);
});
