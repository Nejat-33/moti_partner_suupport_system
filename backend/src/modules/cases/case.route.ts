import { Router } from "express";
import * as cases from "./cases.controller";
import { authenticateToken } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.post("/create", cases.CreateCase);
router.patch("/:id/assign", cases.AssignCase);
// router.patch("/:id/reassign", cases.);
router.patch("/cases/:id/priority", cases.GivePriority);
router.patch("/cases/:id/close", cases.CloseCase);

export const CaseReportRouter = router;
