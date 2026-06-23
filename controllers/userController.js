import { User } from "../models/userModel.js";
import { Message } from "../models/messageModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { io, getReceiverSocketId } from "../socket/socket.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import nodemailer from "nodemailer";
import { Otp } from "../models/otpModel.js";

export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required", success: false });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email is already registered", success: false });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true }
        );

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: process.env.FROM_EMAIL,
            to: email,
            subject: 'Your ChatApp OTP Verification Code',
            text: `Your OTP for ChatApp registration is: ${otp}. It is valid for 5 minutes.`
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ message: "OTP sent successfully", success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to send OTP", success: false });
    }
}

export const register = async (req, res) => {
    try {
        const { fullName, username, password, confirmPassword, gender, email, otp } = req.body;
        if (!fullName || !username || !password || !confirmPassword || !gender || !email || !otp) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Password do not match" });
        }

        const validOtp = await Otp.findOne({ email, otp });
        if (!validOtp) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: "Username already exit try different" });
        }
        
        const emailUser = await User.findOne({ email });
        if (emailUser) {
            return res.status(400).json({ message: "Email already registered" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        // profilePhoto
        const maleProfilePhoto = `https://avatar.iran.liara.run/public/boy?username=${username}`;
        const femaleProfilePhoto = `https://avatar.iran.liara.run/public/girl?username=${username}`;

        await User.create({
            fullName,
            username,
            email,
            password: hashedPassword,
            profilePhoto: gender === "male" ? maleProfilePhoto : femaleProfilePhoto,
            gender
        });
        
        await Otp.deleteOne({ email });
        return res.status(201).json({
            message: "Account created successfully.",
            success: true
        })
    } catch (error) {
        console.log(error);
    }
};
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "All fields are required" });
        };
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({
                message: "Incorrect username or password",
                success: false
            })
        };
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Incorrect username or password",
                success: false
            })
        };
        const tokenData = {
            userId: user._id
        };

        const token = await jwt.sign(tokenData, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });

        return res.status(200)
            .cookie("token", token, {
                maxAge: 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/',
            })
            .json({
                _id: user._id,
                username: user.username,
                fullName: user.fullName,
                profilePhoto: user.profilePhoto,
                about: user.about || "Available",
                blockedUsers: user.blockedUsers || []
            });

    } catch (error) {
        console.log(error);
    }
}
export const logout = (req, res) => {
    try {
        return res.status(200)
            .cookie("token", "", {
                maxAge: 0,
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/',
            })
            .json({
                message: "logged out successfully."
            });
    } catch (error) {
        console.log(error);
    }
}
import { Conversation } from "../models/conversationModel.js";

export const getOtherUsers = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const otherUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
        
        const usersWithUnreadCount = await Promise.all(otherUsers.map(async (user) => {
            const unreadCount = await Message.countDocuments({
                senderId: user._id,
                receiverId: loggedInUserId,
                status: { $ne: 'read' }
            });
            const iAmBlocked = user.blockedUsers.includes(loggedInUserId);
            return { ...user._doc, unreadCount, iAmBlocked };
        }));

        const groups = await Conversation.find({ isGroup: true, participants: loggedInUserId });
        const formattedGroups = groups.map(g => ({
            _id: g._id,
            fullName: g.groupName,
            isGroup: true,
            profilePhoto: "https://avatar.iran.liara.run/public/job/police", // Default group icon
            unreadCount: 0 // Simplification for now
        }));

        return res.status(200).json([...usersWithUnreadCount, ...formattedGroups]);
    } catch (error) {
        console.log(error);
    }
}

export const editProfile = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const { fullName, about } = req.body;
        let profilePhoto = req.body.profilePhoto; // Handle both text URL and file

        if (req.file) {
            // Validate mimetype
            if (!req.file.mimetype.startsWith('image/')) {
                return res.status(400).json({ message: "Only image files are allowed", success: false });
            }

            const uploadFromBuffer = (req) => {
                return new Promise((resolve, reject) => {
                    let cld_upload_stream = cloudinary.uploader.upload_stream(
                        { folder: "chat_app_profiles", resource_type: "auto" },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
                });
            };
            const result = await uploadFromBuffer(req);
            profilePhoto = result.secure_url;
        }

        if (!fullName && !profilePhoto && about === undefined) {
            return res.status(400).json({ message: "Nothing to update", success: false });
        }

        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (profilePhoto) updateData.profilePhoto = profilePhoto;
        if (about !== undefined) updateData.about = about;

        const updatedUser = await User.findByIdAndUpdate(loggedInUserId, updateData, { new: true }).select("-password");
        
        if(!updatedUser) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        return res.status(200).json({
            message: "Profile updated successfully",
            success: true,
            user: updatedUser
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
}

export const toggleBlockUser = async (req, res) => {
    try {
        const loggedInUserId = req.id;
        const targetUserId = req.params.id;

        if (loggedInUserId === targetUserId) {
            return res.status(400).json({ message: "You cannot block yourself", success: false });
        }

        const user = await User.findById(loggedInUserId);
        const targetUser = await User.findById(targetUserId);

        if (!targetUser) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        const isBlocked = user.blockedUsers.includes(targetUserId);

        let finalIsBlocked = false;
        let message = "";

        if (isBlocked) {
            // Unblock
            await User.findByIdAndUpdate(loggedInUserId, {
                $pull: { blockedUsers: targetUserId }
            });
            message = "User unblocked successfully";
            finalIsBlocked = false;
        } else {
            // Block
            await User.findByIdAndUpdate(loggedInUserId, {
                $push: { blockedUsers: targetUserId }
            });
            message = "User blocked successfully";
            finalIsBlocked = true;
        }

        // Notify the target user so their UI can update immediately
        const targetSocketId = getReceiverSocketId(targetUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit("blockedStatusUpdate", {
                byUserId: loggedInUserId,
                isBlocked: finalIsBlocked
            });
        }

        return res.status(200).json({ message, isBlocked: finalIsBlocked, success: true });
    } catch (error) {
        console.log("Error in toggleBlockUser:", error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
}