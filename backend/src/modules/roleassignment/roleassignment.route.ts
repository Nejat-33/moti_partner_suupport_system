import { Router } from "express";
import { assignRole, revokeRole } from "./roleassignment.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.patch("/updaterole", assignRole);
router.patch("/revokerole", revokeRole);

export const RoleRoute = router;
