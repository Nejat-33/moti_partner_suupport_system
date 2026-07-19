import { Router } from "express";
import { updateMyProfile,adminUpdateUserEmail} from "./users.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);
router.patch("/updateProfile", updateMyProfile);
router.patch("/admin/update/:id", adminUpdateUserEmail);
export const UserProfile = router;
