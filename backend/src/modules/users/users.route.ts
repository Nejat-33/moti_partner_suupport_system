import { Router } from "express";
import { updateProfile } from "./users.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);
router.use("/updateProfile", updateProfile);

export const UserProfile = router;
