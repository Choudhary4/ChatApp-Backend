import express from "express";
import { getMessage, sendMessage, editMessage, createGroup, clearChat } from "../controllers/messageController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { upload } from "../middleware/multer.js";

const router = express.Router();

router.route("/group/create").post(isAuthenticated, createGroup);
router.route("/send/:id").post(isAuthenticated, upload.single('file'), sendMessage);
router.route("/edit/:id").put(isAuthenticated, editMessage);
router.route("/clear/:id").delete(isAuthenticated, clearChat);
router.route("/:id").get(isAuthenticated, getMessage);

export default router;