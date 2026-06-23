import { Status } from "../models/statusModel.js";
import { User } from "../models/userModel.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

export const createStatus = async (req, res) => {
    try {
        const userId = req.id;
        const { text } = req.body;
        let mediaUrl = "";

        if(req.file) {
            if(!req.file.mimetype.startsWith('image/')) {
                return res.status(400).json({error: "Only image files are allowed for status updates"});
            }

            const uploadFromBuffer = (req) => {
                return new Promise((resolve, reject) => {
                    let cld_upload_stream = cloudinary.uploader.upload_stream(
                        { folder: "chat_app_status", resource_type: "auto" },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
                });
            };
            const result = await uploadFromBuffer(req);
            mediaUrl = result.secure_url;
        }

        if(!text && !mediaUrl) {
            return res.status(400).json({error: "Status must contain text or an image"});
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

        const newStatus = new Status({
            userId,
            text: text || "",
            mediaUrl,
            expiresAt
        });

        await newStatus.save();

        const populatedStatus = await Status.findById(newStatus._id).populate("userId", "fullName profilePhoto");

        return res.status(201).json({
            message: "Status updated successfully",
            status: populatedStatus,
            success: true
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getStatuses = async (req, res) => {
    try {
        const loggedInUserId = req.id;

        // Fetch statuses that have not expired, populated with user details
        const statuses = await Status.find({
            expiresAt: { $gt: new Date() }
        })
        .populate("userId", "fullName profilePhoto")
        .sort({ createdAt: -1 });

        return res.status(200).json(statuses);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};
