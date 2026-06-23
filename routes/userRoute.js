import express from "express";
import { getOtherUsers, login, logout, register, editProfile, toggleBlockUser, sendOtp } from "../controllers/userController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { upload } from "../middleware/multer.js";

const router = express.Router();

router.route("/send-otp").post(sendOtp);
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/").get(isAuthenticated, getOtherUsers);
router.route("/edit").put(isAuthenticated, upload.single('profilePhoto'), editProfile);
router.route("/block/:id").put(isAuthenticated, toggleBlockUser);

export default router;