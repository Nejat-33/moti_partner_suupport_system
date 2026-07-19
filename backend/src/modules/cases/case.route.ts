import { Router } from "express";
import * as cases from "./cases.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.post("/create", cases.createCustomerCase);
router.post("/auth/create", cases.createAdminCase);
router.patch("/:id/assign", cases.AssignCase);
router.patch("/:id/reassign", cases.ReassignCase);
router.patch("/give/:id/priority", cases.GivePriority);
router.patch("/:id/resolve", cases.resolveCase);
router.post("/close/:id/feedback-close", cases.closeCaseWithFeedback);
router.post("/rejectedcase/:id",  cases.rejectedCase);

export const CaseReportRouter = router;
