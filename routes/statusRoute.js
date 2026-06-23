import express from "express";
import { createStatus, getStatuses } from "../controllers/statusController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { upload } from "../middleware/multer.js";

const router = express.Router();

router.route("/create").post(isAuthenticated, upload.single('media'), createStatus);
router.route("/").get(isAuthenticated, getStatuses);

export default router;
