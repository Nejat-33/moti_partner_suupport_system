import { Router } from "express";
import { assignRole } from "./roleassignment.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";

const router = Router();

router.patch(
  "/assign-role",
  authenticateToken,
  requireRole("SYSTEM_ADMIN"),
  assignRole,
);

export default router;
