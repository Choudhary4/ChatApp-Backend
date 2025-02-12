// index.js
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

// Middleware to parse URL-encoded data, JSON, and cookies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ✅ Updated CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:3000", // Local frontend
    "https://chatapp-frontend-one-mauve.vercel.app" // Production frontend
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies to be sent across domains
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests

// OPTIONAL: A sample login route to demonstrate cookie setup.
// Replace or integrate this with your actual authentication logic.
app.post("/api/v1/login", (req, res) => {
  // After verifying user credentials (this is just an example)
  const token = "example-token"; // Replace with your token generation logic

  // Set cookie options:
  // - httpOnly: true to prevent client-side JS access.
  // - secure: true in production (requires HTTPS).
  // - sameSite: 'none' allows cross-site cookie sharing.
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Set to true in production
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.json({ message: "Logged in successfully" });
});

// Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/message", messageRoute);

// Start Server & Connect to Database
server.listen(PORT, async () => {
  await connectDB();
  console.log(`✅ Server is running on port ${PORT}`);
});
