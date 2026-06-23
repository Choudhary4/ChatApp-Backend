import mongoose from "mongoose";

const statusSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    text: {
        type: String,
        default: ""
    },
    mediaUrl: {
        type: String,
        default: ""
    },
    expiresAt: {
        type: Date,
        required: true,
        // Document automatically deleted after expiresAt
        index: { expires: 0 }
    }
}, { timestamps: true });

export const Status = mongoose.model("Status", statusSchema);
